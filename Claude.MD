# n8n to Frontend

Turn a single n8n workflow into a production web app. One workflow = one project.

**Stack**: n8n (backend) → Next.js + React + Tailwind (frontend) → Vercel (hosting)
**n8n Instance**: https://kaantaskent.app.n8n.cloud
**GitHub**: github.com/kaantaskentt
**Communication**: Frontend POSTs JSON to n8n webhook → n8n processes → returns JSON response

---

## Phase 1: Workflow Validation

Before building any frontend, validate the n8n workflow is app-ready.

### App-Ready Checklist

- [ ] Starts with a **Webhook node** (POST method)
- [ ] Webhook `responseMode` is `"lastNode"` (not `"onReceived"`)
- [ ] Ends with a **Respond to Webhook** node returning structured JSON
- [ ] Input validation exists (IF or Code node checks required fields)
- [ ] Error branch returns `{ "success": false, "error": "message" }` with status 400/500
- [ ] Success branch returns `{ "success": true, "data": { ... } }`

### Validation Steps

1. `n8n_list_workflows` → find the target workflow
2. `n8n_get_workflow` (mode: `"structure"`) → inspect nodes and connections
3. Verify webhook trigger, response mode, and response node exist
4. `n8n_validate_workflow` → check for errors
5. Fix issues with `n8n_update_partial_workflow`
6. Test with curl: `curl -X POST <webhook-test-url> -H "Content-Type: application/json" -d '{"key":"value"}'`

### Common Fixes

| Issue | Fix |
|-------|-----|
| No webhook trigger | Add `n8n-nodes-base.webhook` with POST |
| `responseMode: "onReceived"` | Change to `"lastNode"` |
| No response node | Add `n8n-nodes-base.respondToWebhook` at end |
| Unstructured response | Add Set node before response to shape output |

### Webhook URLs

- **Test**: `https://kaantaskent.app.n8n.cloud/webhook-test/<path>` (works anytime)
- **Production**: `https://kaantaskent.app.n8n.cloud/webhook/<path>` (requires workflow activated)

---

## Phase 2: Frontend Development

### Init

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

### Project Structure

```
src/
├── app/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   └── forms/
├── lib/
│   └── n8n.ts          # Central webhook client — ALL n8n calls go through here
└── types/
    └── index.ts         # Types matching n8n response schema
.env.local               # NEXT_PUBLIC_N8N_WEBHOOK_URL (never committed)
```

### Core: Webhook Client (`src/lib/n8n.ts`)

Single module for all n8n communication:

```typescript
const WEBHOOK_URL = process.env.NEXT_PUBLIC_N8N_WEBHOOK_URL;

export async function callWorkflow<T>(path: string, data: Record<string, unknown>) {
  const res = await fetch(`${WEBHOOK_URL}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json() as Promise<{ success: boolean; data?: T; error?: string }>;
}
```

### Frontend Rules

- TypeScript strict — no `any` types
- App Router (not Pages Router)
- Server Components by default; `"use client"` only when needed
- Every n8n call handles loading, success, and error states
- Mobile-first responsive design
- No hardcoded URLs — use env vars

---

## Testing

1. **Webhook**: curl the test URL, verify JSON response matches expected schema
2. **Local dev**: `npm run dev` → test full flow at localhost:3000
3. **Build check**: `npm run build` must pass with zero errors
4. **Error cases**: empty input, network failure, deactivated workflow

---

## Deployment

1. Create repo on GitHub (github.com/kaantaskentt) via GitHub MCP or `gh`
2. Push to GitHub
3. Import repo in Vercel → set env var `NEXT_PUBLIC_N8N_WEBHOOK_URL`
4. Every push to `main` auto-deploys
5. n8n workflow changes are live immediately (no redeploy needed)
6. Frontend changes: push to GitHub → Vercel auto-deploys

---

## Available Tools

### n8n MCP Server (via .mcp.json)

| Tool | Purpose |
|------|---------|
| `n8n_list_workflows` | Find target workflow |
| `n8n_get_workflow` | Inspect structure |
| `n8n_validate_workflow` | Check for errors |
| `n8n_update_partial_workflow` | Fix/optimize workflow |
| `search_nodes` | Find node types |
| `get_node` | Node config details |

**Node type format**: `nodes-base.webhook` (search) vs `n8n-nodes-base.webhook` (workflow JSON)

### GitHub MCP Server (via .mcp.json)

Create repos, push code, manage PRs, and more — directly from Claude Code.

### Frontend Design Skill (via .claude/skills/)

Generates distinctive, production-grade UI. Avoids generic AI aesthetics. Activated automatically when building frontend components.

### n8n Webhook Data Access

```javascript
// Data sent to webhook is under $json.body
{{ $json.body.email }}    // CORRECT
{{ $json.email }}         // WRONG
```

---

## Rules

1. **Never commit secrets** — `.env.local` stays in `.gitignore`
2. **Validate before building** — Phase 1 before Phase 2, always
3. **Test locally first** — full flow works before deploying
4. **Confirm destructive actions** — ask before deleting/overwriting workflows
5. **Use test webhooks in dev** — production webhooks only in Vercel
6. **One workflow per project** — don't modify unrelated workflows
