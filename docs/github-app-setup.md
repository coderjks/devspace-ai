# GitHub App Setup (Phase 05)

The webhook pipeline works without a GitHub App (manual repo linking + signed
deliveries), but production PR automation needs one. Least-privilege setup:

## 1. Create the App

1. GitHub → Settings → Developer settings → GitHub Apps → New GitHub App.
2. Name: `DevSpace AI Internship` (or similar). Homepage URL: your deployment.
3. **Webhook URL:** `https://<your-api>/api/github/webhook` — check Active.
4. **Webhook secret:** generate one, save it as `GITHUB_WEBHOOK_SECRET`.
5. Permissions (minimum):
   - Repository permissions: **Contents: Read-only**, **Pull requests: Read-only**, **Metadata: Read-only**.
   - No organization, user, or admin permissions.
   - Subscribe to event: **Pull request** only.
6. Create, note the **App ID** → `GITHUB_APP_ID`.
7. Generate a **private key** (.pem), store server-side only → `GITHUB_APP_PRIVATE_KEY_PATH`.

## 2. Install and link

1. Install the App on the student's repository (or org, limited to that repo).
2. Note the installation ID (URL after install, or via API).
3. In DevSpace AI, open the GitHub page and link `owner/repo`. Manual linking
   records `installation_id = NULL`; when the App is installed, update the row
   (or relink) with the installation ID so the server can resolve PR SHAs live.

## 3. Wire a task

PRs map to tickets by the `AI-NNN` key in the PR title, body, or branch name
(e.g. title `[AI-001] Ticket API`, branch `ai-001-ticket-api`). Unlinked repos
and keyless PRs are acknowledged and ignored — never retried in a loop.

## 4. Local testing without GitHub

```bash
GITHUB_WEBHOOK_SECRET=local-dev-secret python scripts/simulate_webhook.py \
  --repo student/internship --pr 7 --sha <40-hex> --task AI-001
```

The script signs a synthetic `pull_request/synchronize` delivery with HMAC and
POSTs it to the local API. The server path is identical to production; only
the delivery origin differs. Never point this script at production.

## 5. Status labels

- `MOCK`: nothing here is mocked — without App credentials the pipeline is
  **live code on manual/test data**, labeled "Manual mode" in the UI.
- `UNTESTED`: real github.com delivery with an installed App. Flip this label
  only after observing a real delivery end-to-end.
