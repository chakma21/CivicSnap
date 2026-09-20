# CivicSnap

**See it. Snap it. Get it fixed.**

![Status](https://img.shields.io/badge/status-actively%20building-orange)
![React](https://img.shields.io/badge/frontend-React%20%2B%20Vite-61DAFB)
![AWS](https://img.shields.io/badge/backend-AWS%20Serverless-FF9900)
![Bedrock](https://img.shields.io/badge/AI-Amazon%20Bedrock-purple)

A civic issue reporting platform that feels like a social feed, not a government complaint form. Citizens photograph problems — potholes, garbage, broken streetlights, water leaks — and they're live in seconds. AI reads the photo and tags the category and severity. Nearby reports of the same pothole get bunched together instead of piling up as noise. Municipal officials get a real, prioritized dashboard instead of an inbox, and every status change is a public timeline citizens can actually follow.

🔗 **Live app:** https://master.d25icco68cl7qc.amplifyapp.com
🎥 **Demo video:** https://youtu.be/8oZiwVgNN8Y

---

## The problem

Civic issues usually get reported — if at all — through phone calls, scattered complaint forms, or word of mouth. There's no shared, visual record of what's broken and where. No way for a citizen to check if something's already been reported before filing a duplicate. No way for a municipality to see everything happening in their ward at a glance. And nothing that flags an issue quietly sitting unresolved for weeks until someone finally complains loud enough.

## The idea

Make reporting as easy as posting to social media, and give municipalities a dashboard they'd actually want to use.

## ✨ What's in it

**For citizens**
- 📸 Snap a photo, write a title — AI suggests the category and severity automatically, location is captured for you
- 🧵 A real feed: story strip of recent reports, search, category filters, sort by newest / most-complained / nearest to me
- 😠 "Complain" instead of "like" — piling onto an existing report instead of a generic upvote, with a popup showing exactly who's complained
- 🗺️ A live map where nearby reports of the same problem cluster into one pin, color-coded by status and colored redder the more people have complained
- 🔁 Before you submit, CivicSnap checks if someone already reported the same spot and offers to add your complaint instead of creating a duplicate
- 🖼️ Multi-photo uploads, tap-to-zoom, shareable permalinks to any single issue
- 🏆 A civic-score leaderboard per ward — points for reports filed, extra for ones that actually got resolved
- 📋 A visible, growing update timeline on every issue as the municipal team works on it

**For municipal officials**
- 🧭 A dashboard scoped to their own ward, with reports triaged by a real priority score (age, complaint volume, escalation status, AI-read severity) — not just a flat list
- 🛠️ Post progress updates with photos that citizens see immediately, or keep a note internal-only for staff coordination
- 👤 Assign an issue to a staff member or team
- ⏰ Automatic escalation: anything pending over 2 weeks gets flagged and an AI-drafted notice is generated and logged, visible right on the dashboard

## 🚧 Still shipping

This isn't a finished, frozen project — it's actively being built out. Expect the feed, map, and dashboard to keep changing as new features land. Recently added: the social-feed redesign, map clustering with a density heat scale, the municipal priority dashboard, duplicate-report detection, and the civic-score leaderboard. Have an idea or found something broken? Open an issue.

## 🛠️ Tech Stack

| Technology | What it does here |
|---|---|
| **React + Vite** | The frontend web app — Feed, Map, Dashboard, Profile, Report, Issue Detail, Leaderboard |
| **Amazon Cognito** | User accounts and login (citizens and municipal officials), with custom profile fields for role, region, and username |
| **AWS Lambda + API Gateway** | The backend API — issue creation, reads, complaints, comments, update timelines, and status changes |
| **DynamoDB** | Stores every issue, its comments, complaints, update history, and status |
| **S3** | Stores uploaded issue photos and resolution proof photos |
| **Amazon Bedrock (Nova Lite / Nova Micro)** | AI that reads uploaded photos (category + severity) and drafts escalation emails |
| **Amazon SES** | Sends the escalation email notifications |
| **EventBridge** | Runs an hourly check for overdue issues and triggers escalation |
| **Leaflet** | Interactive map with real-world-distance clustering and custom status/heat-colored pins |
| **AWS Amplify Hosting** | Hosts the live site, auto-deploying on every push to GitHub |

## 🚀 Quick Start

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

To seed some realistic demo issues into the database:

```bash
npm run seed
```
