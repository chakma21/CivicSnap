import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { ScanCommand, PutCommand, UpdateCommand, GetCommand } from '@aws-sdk/lib-dynamodb'
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'
import { successResponse, errorResponse } from '../utils/apiResponse'
import { dynamoDB, s3Client, config } from '../utils/awsConfig'
import { analyzePhoto } from '../utils/bedrockAnalysis'

// DynamoDBDocumentClient returns DynamoDB Sets (e.g. our upvotedBy String Set) as
// native JS Set instances, which JSON.stringify silently turns into `{}`. Convert
// any Set-valued fields to plain arrays before an item goes out over the API.
function serializeItem<T extends Record<string, unknown>>(item: T): T {
  const out: Record<string, unknown> = { ...item }
  for (const key of Object.keys(out)) {
    if (out[key] instanceof Set) {
      out[key] = Array.from(out[key] as Set<unknown>)
    }
  }
  return out as T
}

export async function handler(
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> {
  console.log('Incoming event:', JSON.stringify(event, null, 2))

  const path = event.rawPath
  const httpMethod = event.requestContext.http.method

  try {
    if (httpMethod === 'OPTIONS') {
      return successResponse({})
    }

    if (path === '/health' && httpMethod === 'GET') {
      return successResponse({ status: 'healthy' })
    }

    if (path === '/issues' && httpMethod === 'GET') {
      const result = await dynamoDB.send(new ScanCommand({ TableName: config.tableName }))
      return successResponse({ issues: (result.Items ?? []).map(serializeItem) })
    }

    if (path === '/uploads/presign' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { fileName, contentType } = body
      if (!fileName || !contentType) {
        return errorResponse(new Error('fileName and contentType are required'), 400)
      }

      const key = `issues/${randomUUID()}-${fileName}`
      const uploadUrl = await getSignedUrl(
        s3Client,
        new PutObjectCommand({ Bucket: config.s3BucketName, Key: key, ContentType: contentType }),
        { expiresIn: 300 },
      )
      const photoUrl = `https://${config.s3BucketName}.s3.ap-south-1.amazonaws.com/${key}`
      return successResponse({ uploadUrl, photoUrl, key })
    }

    if (path === '/issues' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { title, description, category, wardId, lat, lng, userId, username, photoUrls, photoKeys } = body

      if (!title || !userId) {
        return errorResponse(new Error('title and userId are required'), 400)
      }

      // AI analysis only runs on the first photo — extra Bedrock calls per report
      // aren't worth the cost, and one photo is enough to suggest category/severity.
      const firstPhotoKey: string | undefined = photoKeys?.[0]
      let aiAnalysis = null
      if (firstPhotoKey) {
        try {
          const format = firstPhotoKey.split('.').pop()?.toLowerCase() === 'png' ? 'png' : 'jpeg'
          const s3Object = await s3Client.send(new GetObjectCommand({ Bucket: config.s3BucketName, Key: firstPhotoKey }))
          const imageBytes = Buffer.from(await s3Object.Body!.transformToByteArray())
          aiAnalysis = await analyzePhoto(imageBytes, format)
        } catch (err) {
          console.error('Could not run AI analysis on uploaded photo (non-fatal):', err)
        }
      }

      const item = {
        issueId: randomUUID(),
        createdAt: Date.now(),
        title,
        description: description || '',
        category: aiAnalysis?.suggestedCategory || category || 'other',
        wardId: wardId || 'unknown',
        lat: lat ?? null,
        lng: lng ?? null,
        userId,
        username: username || 'Anonymous',
        status: 'pending',
        photoUrl: photoUrls?.[0] || null,
        photoUrls: photoUrls || [],
        aiAnalysis,
        upvoterNames: {},
      }

      await dynamoDB.send(new PutCommand({ TableName: config.tableName, Item: item }))
      return successResponse(item, 201)
    }

    if (path === '/issues/upvote' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { issueId, createdAt, userId, username } = body
      if (!issueId || createdAt == null || !userId) {
        return errorResponse(new Error('issueId, createdAt, and userId are required'), 400)
      }

      const existing = await dynamoDB.send(new GetCommand({
        TableName: config.tableName,
        Key: { issueId, createdAt },
      }))
      const upvotedBy: Set<string> | undefined = existing.Item?.upvotedBy
      const alreadyUpvoted = upvotedBy?.has(userId) ?? false

      // upvoterNames tracks who complained (not just how many) so the feed can show
      // "Complaint from <name> and N more". Read-modify-write here since the map may
      // not exist yet on older items, and DynamoDB can't SET a nested path on a
      // parent map that doesn't exist.
      const upvoterNames: Record<string, string> = { ...(existing.Item?.upvoterNames || {}) }
      if (alreadyUpvoted) {
        delete upvoterNames[userId]
      } else {
        upvoterNames[userId] = username || 'A citizen'
      }

      const result = await dynamoDB.send(new UpdateCommand({
        TableName: config.tableName,
        Key: { issueId, createdAt },
        UpdateExpression: (alreadyUpvoted ? 'DELETE upvotedBy :userIdSet' : 'ADD upvotedBy :userIdSet') + ' SET upvoterNames = :names',
        ExpressionAttributeValues: { ':userIdSet': new Set([userId]), ':names': upvoterNames },
        ReturnValues: 'ALL_NEW',
      }))
      return successResponse(serializeItem(result.Attributes!))
    }

    if (path === '/issues/comment' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { issueId, createdAt, userId, username, userEmail, text } = body
      if (!issueId || createdAt == null || !userId || !text?.trim()) {
        return errorResponse(new Error('issueId, createdAt, userId, and text are required'), 400)
      }

      const comment = {
        commentId: randomUUID(),
        userId,
        username: username || userEmail || 'Anonymous',
        text: text.trim(),
        createdAt: Date.now(),
      }

      const result = await dynamoDB.send(new UpdateCommand({
        TableName: config.tableName,
        Key: { issueId, createdAt },
        UpdateExpression: 'SET comments = list_append(if_not_exists(comments, :empty), :newComment)',
        ExpressionAttributeValues: { ':empty': [], ':newComment': [comment] },
        ReturnValues: 'ALL_NEW',
      }))
      return successResponse(serializeItem(result.Attributes!), 201)
    }

    if (path === '/issues/update' && httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}')
      const { issueId, createdAt, text, photoUrl, authorUsername, visibility } = body
      if (!issueId || createdAt == null || (!text?.trim() && !photoUrl)) {
        return errorResponse(new Error('issueId, createdAt, and text or photoUrl are required'), 400)
      }

      const update = {
        updateId: randomUUID(),
        text: (text || '').trim(),
        photoUrl: photoUrl || null,
        authorUsername: authorUsername || 'Municipal team',
        visibility: visibility === 'internal' ? 'internal' : 'public',
        createdAt: Date.now(),
      }

      const result = await dynamoDB.send(new UpdateCommand({
        TableName: config.tableName,
        Key: { issueId, createdAt },
        UpdateExpression: 'SET updates = list_append(if_not_exists(updates, :empty), :newUpdate)',
        ExpressionAttributeValues: { ':empty': [], ':newUpdate': [update] },
        ReturnValues: 'ALL_NEW',
      }))
      return successResponse(serializeItem(result.Attributes!), 201)
    }

    if (path === '/issues/status' && httpMethod === 'PATCH') {
      const body = JSON.parse(event.body || '{}')
      const { issueId, createdAt, status, proofPhotoUrl, assignedTo } = body
      const validStatuses = ['pending', 'in-progress', 'resolved']
      if (!issueId || createdAt == null || !validStatuses.includes(status)) {
        return errorResponse(new Error('issueId, createdAt, and a valid status are required'), 400)
      }

      const updateParts = ['#status = :status']
      const attrValues: Record<string, unknown> = { ':status': status }
      if (proofPhotoUrl) {
        updateParts.push('proofPhotoUrl = :proofPhotoUrl')
        attrValues[':proofPhotoUrl'] = proofPhotoUrl
      }
      if (assignedTo !== undefined) {
        updateParts.push('assignedTo = :assignedTo')
        attrValues[':assignedTo'] = assignedTo || null
      }

      const result = await dynamoDB.send(new UpdateCommand({
        TableName: config.tableName,
        Key: { issueId, createdAt },
        UpdateExpression: `SET ${updateParts.join(', ')}`,
        ExpressionAttributeNames: { '#status': 'status' },
        ExpressionAttributeValues: attrValues,
        ReturnValues: 'ALL_NEW',
      }))
      return successResponse(serializeItem(result.Attributes!))
    }

    return errorResponse(new Error('Not Found'), 404)
  } catch (error) {
    console.error('Error:', error)
    return errorResponse(error as Error)
  }
}
