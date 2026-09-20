# CivicSnap

**See it. Snap it. Get it fixed.**

An Instagram-style civic issue reporting platform — citizens photograph and report problems like potholes, garbage, broken streetlights, and water issues; AI automatically categorizes them; and municipal officials track, resolve, and get automatically nudged on anything left unresolved.

🔗 **Live demo:** https://master.d25icco68cl7qc.amplifyapp.com

## Problem Statement

Civic issues — potholes, overflowing garbage, broken streetlights, water leaks — usually get reported (if at all) through phone calls, scattered complaint forms, or word of mouth. There's no shared, visual record of what's broken and where, no way for citizens to see if an issue is already known, no easy way for a municipality to see everything happening in their ward at a glance, and nothing that flags issues quietly sitting unresolved for weeks.

## Our Solution

CivicSnap turns issue reporting into something as easy as posting to social media, and gives municipalities a real dashboard instead of a pile of complaints:

- **Citizens** snap a photo, add a title/description, and the location is captured automatically — the issue appears instantly in a public feed anyone can browse, search, filter by category, upvote, and comment on
- **AI (Amazon Bedrock)** looks at the photo and auto-suggests the category and severity, so reporting takes seconds
- **A live map** shows every reported issue with clustering for areas with multiple reports, plus a "locate me" button
- **Municipal officials** get a dashboard scoped to their own region/ward, can update status and attach proof-of-resolution photos through a simple side panel
- **Automatic escalation**: any issue left pending for over 2 weeks is auto-flagged, and an AI-drafted email notice is generated and logged — visible right on the dashboard, showing exactly what was sent

## Tech Stack

| Technology | What it does here |
|---|---|
| **React + Vite** | The frontend web app — all pages (Feed, Map, Dashboard, Profile, Report) |
| **Amazon Cognito** | User accounts and login (citizens and municipal officials), including custom profile fields for role, region, and username |
| **AWS Lambda + API Gateway** | The backend API — handles issue creation, reads, upvotes, comments, and status updates |
| **DynamoDB** | Stores every issue, its comments, upvotes, and status history |
| **S3** | Stores uploaded issue photos and resolution proof photos |
| **Amazon Bedrock (Nova Lite / Nova Micro)** | AI that analyzes uploaded photos (category + severity) and drafts escalation emails |
| **Amazon SES** | Sends the escalation email notifications |
| **EventBridge** | Runs an hourly check for overdue issues and triggers escalation |
| **Leaflet** | Interactive map with pin clustering |
| **AWS Amplify Hosting** | Hosts the live site, auto-deploying on every push to GitHub |

## Quick Start

```bash
git clone https://github.com/chakma21/CivicSnap.git
cd CivicSnap
npm install --workspace=frontend
```

Create `frontend/.env` (copy `frontend/.env.example` and fill in the values — ask a team member for the actual Cognito/API IDs), then:

```bash
npm run dev:frontend
```

Open **http://localhost:3000**.

### Test accounts

| Email | Password | Role |
|---|---|---|
| `test-citizen@civicsnap.local` | `TestPass123!` | Citizen |
| `test-municipal@civicsnap.local` | `TestPass123!` | Municipal Official (region: `morena`) |

### Backend changes

```bash
cd backend
npm install
npm run deploy
```

Bundles and deploys both Lambda functions to AWS in one command.
