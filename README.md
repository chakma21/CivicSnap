# CivicSnap — AI-Powered Civic Issue Tracker

An Instagram-style civic issue reporting platform: citizens snap a photo and report problems (potholes, garbage, broken streetlights, water issues), AI auto-categorizes them, and municipal officials manage and resolve them by region — all on AWS serverless infrastructure.

## Tech Stack

- **Frontend**: React 18, Vite, React Router, Leaflet (maps)
- **Backend**: AWS Lambda (TypeScript, Node.js 20) behind API Gateway (HTTP API)
- **Database**: DynamoDB (single table, on-demand)
- **Storage**: S3 (photo uploads)
- **Auth**: Amazon Cognito (User Pools)
- **AI**: Amazon Bedrock (Nova Lite for photo analysis, Nova Micro for escalation email drafting)
- **Notifications**: Amazon SES
- **Automation**: EventBridge (hourly escalation check)

## Project Structure

```
civicsnap/
├── frontend/               # React (Vite) web app
│   └── src/
│       ├── pages/           # Auth, Feed, Map, Dashboard, Profile, ReportIssue
│       └── components/      # Navigation, TopBar, CommentSection, StatusUpdateModal
├── backend/                 # AWS Lambda functions (TypeScript)
│   ├── src/handlers/         # apiGateway.ts (main API), escalation.ts (scheduled job)
│   ├── src/utils/            # AWS SDK clients, Bedrock helpers, API response helpers
│   └── scripts/deploy.mjs    # Bundles + deploys both Lambdas to AWS
└── README.md
```

## Prerequisites

- **Node.js 18+** and npm
- **Git**
- **AWS CLI v2**, configured with credentials that have access to this project's AWS account (only needed if you'll deploy backend changes — not needed just to run the frontend against the existing backend)

## Getting Started (fastest path — use the already-deployed backend)

All AWS infrastructure (Cognito, DynamoDB, S3, Lambda, API Gateway, EventBridge) is **already created and running** under the project's AWS account. You don't need to set any of it up yourself — you just need the connection details.

### 1. Clone and install

```bash
git clone <this-repo-url>
cd civicsnap
npm install --workspace=frontend
```

### 2. Get the environment values

Ask whoever set up the AWS account (or check the team's shared secrets) for the values below, then create `frontend/.env` (copy `frontend/.env.example` and fill it in):

```env
VITE_API_BASE_URL=<the API Gateway URL>
VITE_AWS_REGION=ap-south-1
VITE_COGNITO_DOMAIN=<the Cognito hosted domain>
VITE_COGNITO_USER_POOL_ID=<the Cognito User Pool ID>
VITE_COGNITO_CLIENT_ID=<the Cognito App Client ID>
VITE_COGNITO_REDIRECT_URI=http://localhost:3000/auth/callback
```

**Never commit this file** — it's already in `.gitignore`.

### 3. Run it

```bash
npm run dev:frontend
```

Open **http://localhost:3000**. Sign up with any email (you'll get a real verification code by email via Cognito), pick "Citizen" or "Municipal Official", and start using the app. Municipal accounts also need to set a Region/Ward in Manage Profile to see issues for their area.

That's it — no AWS setup needed for frontend-only work.

## Making Backend Changes

If you need to modify Lambda code (`backend/src/handlers/*.ts` or `backend/src/utils/*.ts`):

```bash
npm install --workspace=backend   # first time only
cd backend
npm run deploy
```

This single command bundles both Lambda functions (`civicsnap-api` and `civicsnap-escalation`) with esbuild and pushes them straight to AWS — no manual zip/upload steps. It requires the AWS CLI to be installed and configured with credentials that have permission to update these two Lambda functions (ask the account owner for access, or see "Setting Up Your Own AWS Account" below if you want independent infrastructure).

To type-check without deploying: `npm run typecheck` (from `backend/`).

## Setting Up Your Own AWS Account (optional — only if you want independent infrastructure)

If you'd rather not share the existing backend, you can provision your own copy of everything (Cognito, DynamoDB, S3, Lambda, API Gateway, IAM, EventBridge). This is a from-scratch AWS setup — expect it to take an hour or more the first time. At a high level you'll need to:

1. Create a Cognito User Pool with email sign-in, a custom `role` attribute (citizen/municipality), a custom `region` attribute, and a custom `username` attribute
2. Create a DynamoDB table `civicsnap-issues` (partition key `issueId` string, sort key `createdAt` number)
3. Create an S3 bucket for photo uploads with public-read on the `issues/*` prefix only
4. Create an IAM role for Lambda with scoped access to the above plus Bedrock and SES
5. Deploy the two Lambda functions and wire up an HTTP API in API Gateway
6. Create an EventBridge rule to run the escalation Lambda hourly
7. Update `frontend/.env` with your own resource IDs

This isn't scripted as Infrastructure-as-Code yet — if your team ends up needing this often, ask about setting up a CloudFormation/CDK template instead of repeating these steps manually.

## Enabling Bedrock AI Features

Photo analysis (auto-categorization) and AI-drafted escalation emails use Amazon Bedrock. **New AWS accounts must request model access once** before any Bedrock model can be invoked:

1. Open the **Bedrock Console** → **Model access** (left sidebar)
2. Click **Enable specific models** (or **Modify model access**)
3. Check **Nova Lite** and **Nova Micro** → Submit
4. Amazon's own models are typically approved instantly

Until this is done, photo analysis silently returns no AI suggestion, and escalation emails fall back to a plain template — both degrade gracefully rather than breaking anything.

## Test Accounts

Two test accounts exist in the shared Cognito pool for quick manual testing:

| Email | Password | Role | Region |
|---|---|---|---|
| `test-citizen@civicsnap.local` | `TestPass123!` | Citizen | — |
| `test-municipal@civicsnap.local` | `TestPass123!` | Municipal Official | `morena` |

## Cost

Everything is designed to stay within AWS Free Tier: DynamoDB provisioned at 5 RCU/WCU per table+index, Lambda's always-free 1M requests/month, S3's 5GB free tier, Cognito's 10,000 free MAU. **Bedrock is the one exception** — it has no free tier and bills a small amount per request (a fraction of a cent per photo analyzed), drawn from any promotional credit on the account.

## Deploying the Frontend Publicly

Not yet set up. The plan is AWS Amplify Hosting connected to this repo for automatic deploys on every push — ask in the team channel if this has been wired up yet before assuming `npm run dev` is the only way to view the app.
