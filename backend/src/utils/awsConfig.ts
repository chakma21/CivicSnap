import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb'
import { S3Client } from '@aws-sdk/client-s3'
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime'
import { SESClient } from '@aws-sdk/client-ses'

// AWS SDK v3 clients configuration
const region = process.env.AWS_REGION || 'us-east-1'

export const dynamoDBClient = new DynamoDBClient({ region })
export const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient)
export const s3Client = new S3Client({ region })
export const bedrockClient = new BedrockRuntimeClient({ region })
export const sesClient = new SESClient({ region })

export const config = {
  tableName: process.env.DYNAMODB_TABLE_NAME || 'civicsnap-issues',
  s3BucketName: process.env.S3_BUCKET_NAME || 'civicsnap-uploads',
  bedrockModel: process.env.BEDROCK_MODEL || 'amazon.nova-micro-v1:0',
  sesFromEmail: process.env.SES_FROM_EMAIL || 'noreply@civicsnap.local',
}
