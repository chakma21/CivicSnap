import { ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'
import { SendEmailCommand } from '@aws-sdk/client-ses'
import { dynamoDB, sesClient, config } from '../utils/awsConfig'
import { draftEscalationEmail } from '../utils/bedrockAnalysis'

const ESCALATION_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000 // 2 weeks
const NOTIFY_EMAIL = process.env.ESCALATION_NOTIFY_EMAIL

function fallbackEmailBody(issues: { title: string; wardId: string; createdAt: number }[]): string {
  const lines = issues.map((i) => `- ${i.title} (${i.wardId}, pending since ${new Date(i.createdAt).toLocaleDateString()})`)
  return `The following ${issues.length} issue(s) have been pending for over 2 weeks and need attention:\n\n${lines.join('\n')}\n\n— CivicSnap Automated Alerts`
}

export async function handler() {
  const cutoff = Date.now() - ESCALATION_THRESHOLD_MS

  const result = await dynamoDB.send(new ScanCommand({
    TableName: config.tableName,
    FilterExpression: '#status = :pending AND createdAt < :cutoff',
    ExpressionAttributeNames: { '#status': 'status' },
    ExpressionAttributeValues: { ':pending': 'pending', ':cutoff': cutoff },
  }))

  const overdueIssues = result.Items ?? []
  console.log(`Found ${overdueIssues.length} overdue issue(s) to escalate`)

  if (overdueIssues.length === 0) {
    return { escalated: 0 }
  }

  const subject = `CivicSnap: ${overdueIssues.length} issue(s) escalated`
  const draftedBody = await draftEscalationEmail(
    overdueIssues.map((i) => ({
      title: i.title,
      wardId: i.wardId,
      category: i.category,
      daysPending: Math.floor((Date.now() - i.createdAt) / (24 * 60 * 60 * 1000)),
    })),
  )
  const emailBody = draftedBody || fallbackEmailBody(overdueIssues as any)
  const sentAt = Date.now()

  for (const issue of overdueIssues) {
    await dynamoDB.send(new UpdateCommand({
      TableName: config.tableName,
      Key: { issueId: issue.issueId, createdAt: issue.createdAt },
      UpdateExpression: 'SET #status = :status, escalationEmail = :email',
      ExpressionAttributeNames: { '#status': 'status' },
      ExpressionAttributeValues: {
        ':status': 'escalated',
        ':email': { subject, body: emailBody, sentAt, generatedBy: draftedBody ? 'bedrock' : 'template' },
      },
    }))
  }

  if (NOTIFY_EMAIL) {
    try {
      await sesClient.send(new SendEmailCommand({
        Source: NOTIFY_EMAIL,
        Destination: { ToAddresses: [NOTIFY_EMAIL] },
        Message: {
          Subject: { Data: subject },
          Body: { Text: { Data: emailBody } },
        },
      }))
    } catch (err) {
      console.error('Escalation email failed (non-fatal, likely unverified SES identity):', err)
    }
  }

  return { escalated: overdueIssues.length }
}
