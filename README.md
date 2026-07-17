# FitCoach

FitCoach is a polished conversational fitness companion built with Next.js. It combines an AI coaching workflow with local progress tracking, streaks, badges, onboarding, and a responsive chat interface.

## What it does

- Guides users through training, nutrition, recovery, mobility, and general fitness questions.
- Sends chat messages to a configurable n8n workflow with a stable browser session ID.
- Tracks XP, levels, streaks, and topic-specific badges in local storage.
- Preserves the conversation locally and supports starting a clean session.
- Adapts the coaching workspace and progress sidebar for desktop and mobile.

## Product status

This repository is a working product prototype. The interface and local progression system run independently; AI responses require an n8n webhook configured by the operator.

## Stack

- Next.js 16 and React 19
- TypeScript and Tailwind CSS
- n8n webhook integration
- Browser local storage for profile, conversation, and progression state

## Run locally

Requirements: Node.js 22 and npm.

```bash
git clone https://github.com/kaantaskentt/fitcoach-frontend.git
cd fitcoach-frontend
cp .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Set the workflow endpoint in `.env.local`:

```bash
NEXT_PUBLIC_N8N_WEBHOOK_URL=https://your-n8n-host.example/webhook/fitness-coach
```

## Quality checks

```bash
npm run lint
npm run build
npm audit --audit-level=moderate
```

Pull requests run the same checks in GitHub Actions. Dependency alerts, automated security fixes, secret scanning, push protection, and private vulnerability reporting are enabled for the repository.

## Privacy and security

- The browser sends the chat message and a random session ID only to the configured workflow.
- Local profile and progression state remain in the browser.
- The workflow URL is environment configuration, not source code.
- No production credentials belong in `NEXT_PUBLIC_*` variables; values with that prefix are visible to the browser.

For vulnerability reports, use the private reporting flow in the repository Security tab.
