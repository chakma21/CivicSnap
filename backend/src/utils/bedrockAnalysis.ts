import { InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { bedrockClient } from './awsConfig'

const NOVA_LITE_INFERENCE_PROFILE =
  'arn:aws:bedrock:ap-south-1:453983326266:inference-profile/apac.amazon.nova-lite-v1:0'
const NOVA_MICRO_INFERENCE_PROFILE =
  'arn:aws:bedrock:ap-south-1:453983326266:inference-profile/apac.amazon.nova-micro-v1:0'

export interface PhotoAnalysis {
  suggestedCategory: string
  severity: string
  summary: string
}

const PROMPT = `You are triaging a civic issue report photo (potholes, garbage, broken streetlights, water leaks, etc).
Respond with ONLY a JSON object, no other text, in this exact shape:
{"suggestedCategory": "road" | "garbage" | "streetlight" | "water" | "other", "severity": "low" | "medium" | "high", "summary": "one short sentence describing what you see"}`

export async function analyzePhoto(imageBytes: Buffer, format: string): Promise<PhotoAnalysis | null> {
  try {
    const command = new InvokeModelCommand({
      modelId: NOVA_LITE_INFERENCE_PROFILE,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: [
              { image: { format, source: { bytes: imageBytes.toString('base64') } } },
              { text: PROMPT },
            ],
          },
        ],
        inferenceConfig: { maxTokens: 200, temperature: 0.2 },
      }),
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'))
    const text: string = responseBody.output.message.content[0].text
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    return {
      suggestedCategory: parsed.suggestedCategory || 'other',
      severity: parsed.severity || 'medium',
      summary: parsed.summary || '',
    }
  } catch (error) {
    console.error('Bedrock analysis failed (non-fatal):', error)
    return null
  }
}

export interface OverdueIssueSummary {
  title: string
  wardId: string
  category: string
  daysPending: number
}

// Text-only, so Nova Micro (cheaper than Lite) is enough for drafting the notice.
export async function draftEscalationEmail(issues: OverdueIssueSummary[]): Promise<string | null> {
  const issueList = issues
    .map((i) => `- "${i.title}" (${i.category}, ward: ${i.wardId}, pending ${i.daysPending} days)`)
    .join('\n')

  const prompt = `You are writing a short, professional email to a municipal official notifying them that the following civic issues have been pending unresolved for over two weeks and need urgent attention:
${issueList}

Write a concise email body (plain text, no subject line, no markdown, under 150 words) that: states how many issues are overdue, lists them briefly, and requests prompt action. Sign off as "CivicSnap Automated Alerts".`

  try {
    const command = new InvokeModelCommand({
      modelId: NOVA_MICRO_INFERENCE_PROFILE,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 300, temperature: 0.4 },
      }),
    })

    const response = await bedrockClient.send(command)
    const responseBody = JSON.parse(Buffer.from(response.body).toString('utf-8'))
    return responseBody.output.message.content[0].text.trim()
  } catch (error) {
    console.error('Bedrock escalation email drafting failed (non-fatal, falling back to template):', error)
    return null
  }
}
