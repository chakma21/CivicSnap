// Seeds a handful of realistic demo issues so the app has visible content
// (per this project's standing rule: demo data is left in place, not cleaned up).
// Usage: npm run seed   (from backend/)
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'node:crypto'

const region = process.env.AWS_REGION || 'ap-south-1'
const tableName = process.env.DYNAMODB_TABLE_NAME || 'civicsnap-issues'
const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region }))

const PHOTO_BASE = 'https://civicsnap-uploads-453983326266.s3.ap-south-1.amazonaws.com/issues'

const REPORTERS = {
  pratham: { userId: 'seed-pratham', username: 'Pratham' },
  shiny: { userId: 'seed-shiny', username: 'Shiny' },
  sid: { userId: 'seed-sid', username: 'Sid' },
  prince: { userId: 'seed-prince', username: 'Prince' },
  krishi: { userId: 'seed-krishi', username: 'Krishi' },
}

const now = Date.now()
const daysAgo = (d) => now - d * 24 * 60 * 60 * 1000

function buildItem({ reporter, title, description, category, wardId, lat, lng, status, photoKey, createdAt, complaints = [] }) {
  const upvoterNames = {}
  for (const c of complaints) upvoterNames[REPORTERS[c].userId] = REPORTERS[c].username

  return {
    issueId: randomUUID(),
    createdAt,
    title,
    description,
    category,
    wardId,
    lat,
    lng,
    userId: REPORTERS[reporter].userId,
    username: REPORTERS[reporter].username,
    status,
    photoUrl: photoKey ? `${PHOTO_BASE}/${photoKey}` : null,
    aiAnalysis: null,
    upvotedBy: complaints.length > 0 ? new Set(complaints.map((c) => REPORTERS[c].userId)) : undefined,
    upvoterNames,
  }
}

const items = [
  // Same pothole on FC Road, reported independently by 3 people within ~5m of
  // each other — demonstrates map clustering + the red/yellow density heat scale.
  buildItem({
    reporter: 'pratham',
    title: 'Deep pothole on FC Road',
    description: 'Right outside the college gate, cars are swerving into oncoming traffic to avoid it.',
    category: 'road',
    wardId: 'FC Road, Pune',
    lat: 18.52452, lng: 73.83987,
    status: 'pending',
    photoKey: 'seed-pothole-1.jpg',
    createdAt: daysAgo(6),
    complaints: ['shiny', 'sid'],
  }),
  buildItem({
    reporter: 'shiny',
    title: 'Same pothole, still not fixed',
    description: 'Reporting again, my scooter wheel got stuck here yesterday.',
    category: 'road',
    wardId: 'FC Road, Pune',
    lat: 18.52455, lng: 73.83987,
    status: 'pending',
    photoKey: 'seed-pothole-2.jpg',
    createdAt: daysAgo(4),
  }),
  buildItem({
    reporter: 'sid',
    title: 'Pothole getting bigger after the rain',
    description: 'Water is pooling and hiding how deep it actually is now.',
    category: 'road',
    wardId: 'FC Road, Pune',
    lat: 18.52452, lng: 73.83990,
    status: 'pending',
    photoKey: 'seed-pothole-1.jpg',
    createdAt: daysAgo(2),
  }),
  // Pune, standalone, in-progress (blue pin)
  buildItem({
    reporter: 'prince',
    title: 'Garbage pile near Koregaon Park lane',
    description: 'Municipal truck has skipped this street for over a week.',
    category: 'garbage',
    wardId: 'Koregaon Park, Pune',
    lat: 18.5362, lng: 73.8938,
    status: 'in-progress',
    photoKey: 'seed-garbage-1.jpg',
    createdAt: daysAgo(5),
  }),
  // Pune, standalone, resolved (green pin)
  buildItem({
    reporter: 'krishi',
    title: 'Broken streetlight near IT park entrance',
    description: 'Whole stretch is pitch dark after 8pm, unsafe for walking.',
    category: 'streetlight',
    wardId: 'Hinjewadi, Pune',
    lat: 18.5913, lng: 73.7389,
    status: 'resolved',
    photoKey: null,
    createdAt: daysAgo(12),
  }),
  // Gwalior, standalone, pending (single report -> yellow end of the heat scale)
  buildItem({
    reporter: 'sid',
    title: 'Large pothole near Phool Bagh crossing',
    description: 'Two-wheelers keep skidding here every morning.',
    category: 'road',
    wardId: 'Phool Bagh, Gwalior',
    lat: 26.2183, lng: 78.1828,
    status: 'pending',
    photoKey: 'seed-pothole-1.jpg',
    createdAt: daysAgo(3),
  }),
  // Gwalior, standalone, resolved (green pin)
  buildItem({
    reporter: 'prince',
    title: 'Garbage dump cleared near Lashkar market',
    description: 'Was piling up for weeks, municipal team finally cleared it.',
    category: 'garbage',
    wardId: 'Lashkar, Gwalior',
    lat: 26.2090, lng: 78.1746,
    status: 'resolved',
    photoKey: 'seed-garbage-2.jpg',
    createdAt: daysAgo(15),
  }),
]

for (const item of items) {
  const clean = Object.fromEntries(Object.entries(item).filter(([, v]) => v !== undefined))
  await client.send(new PutCommand({ TableName: tableName, Item: clean }))
  console.log(`Seeded: ${clean.title} (${clean.wardId})`)
}

console.log(`\nDone — ${items.length} demo issues seeded into ${tableName}.`)
