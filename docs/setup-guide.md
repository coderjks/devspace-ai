# DevSpace AI — Zero-to-Running Setup Guide

No git experience needed. Follow the steps in order; every command is copy-paste.
Time needed: about 30–45 minutes, mostly waiting on installs.

> You will install: Git, Docker Desktop, Python 3.12+, Node.js 20+. Nothing
> else. All project dependencies install themselves in steps 5–6.

## Step 0 — Open a terminal

- **Mac:** press `Cmd + Space`, type `Terminal`, press Enter.
- **Windows:** install [Git for Windows](https://git-scm.com/download/win) first,
  then open **Git Bash** (it acts as your terminal for everything below).
- **Linux:** `Ctrl + Alt + T`.

From here on, "run" means: type (or paste) the command, press Enter, wait for it to finish.

## Step 1 — Install Git

**Mac (pick one):**
```bash
xcode-select --install
```
If that says "already installed", you're done. Otherwise install
[Homebrew](https://brew.sh) and run `brew install git`.

**Windows:** [Git for Windows](https://git-scm.com/download/win) — accept all defaults.

**Linux (Ubuntu/Debian):**
```bash
sudo apt update && sudo apt install -y git
```

Check it worked:
```bash
git --version
```
You should see a version number like `git version 2.4x`.

## Step 2 — Tell Git who you are

Git stamps your name on commits. One time only:
```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
```

## Step 3 — Install Docker Desktop, Python, Node

1. **Docker Desktop:** [docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop) —
   install it **and start it** (whale icon in the menu bar). The database and
   job queue run inside Docker; nothing is installed on your machine directly.
2. **Python 3.12+:** [python.org/downloads](https://www.python.org/downloads/) —
   on Windows, tick **"Add python.exe to PATH"** during install.
3. **Node.js 20 LTS:** [nodejs.org](https://nodejs.org/) — accept defaults.

Verify all three:
```bash
docker --version
python3 --version
node --version
```
If any says "command not found", close and reopen your terminal, then retry.

## Step 4 — Download (clone) the project

```bash
cd ~/Documents
git clone <PASTE-REPO-URL-HERE>
cd devspace-ai
```
Replace `<PASTE-REPO-URL-HERE>` with the link from the GitHub page's green
**Code** button (use the HTTPS one). You'll get a `devspace-ai` folder —
everything lives inside it.

## Step 5 — Set up the backend (Python)

These commands create an isolated Python environment and install libraries.
Run them from inside the `devspace-ai` folder:
```bash
python3 -m venv .venv
./.venv/bin/python -m pip install -r api/requirements.txt
```
(Windows Git Bash: `python -m venv .venv` then `./.venv/Scripts/python -m pip install -r api/requirements.txt`.
Use `./.venv/Scripts/...` instead of `./.venv/bin/...` everywhere below.)

## Step 6 — Set up the frontend (web)

```bash
cd web
npm install
cd ..
```
This downloads the website's libraries. It takes a few minutes — that's normal.

## Step 7 — Start everything

```bash
./scripts/dev.sh
```
This one command: starts Postgres + Redis in Docker, sets up the database,
loads the demo sprint, and launches the API and website. Wait for:
```
Open http://127.0.0.1:3000 (demo@devspace.ai / DemoPass123!)
```

## Step 8 — Log in and look around

1. Open **http://127.0.0.1:3000** in your browser.
2. Log in with **demo@devspace.ai** / **DemoPass123!**
3. Tour: Dashboard → Board → open ticket AI-001 → Team → Standup → GitHub →
   Voice → Progression → Learning.

## Everyday commands

```bash
./scripts/dev.sh status   # is everything running?
./scripts/dev.sh stop     # stop the servers (frees ports 3000/8000)
./scripts/dev.sh          # start again
```

To get the latest code later:
```bash
git pull
```

## If something goes wrong

| Symptom | Fix |
|---|---|
| `docker: command not found` | Docker Desktop isn't installed, or terminal opened before install — reopen terminal |
| `address already in use :3000` (or `:8000`) | `./scripts/dev.sh stop`, then start again |
| `.venv missing` | You skipped step 5 — run it |
| `web/node_modules missing` | You skipped step 6 — run `npm install` in `web/` |
| `migration failed` / database errors | Make sure Docker Desktop is **running** (whale icon), then retry |
| Login says "failed to fetch" | API isn't up — run `./scripts/dev.sh status`; if API is down, check `/tmp/devspace/api.log` |
| Page shows text but no styling | Stop, delete the `web/.next` folder, start again |

Still stuck? Copy the exact error message and the last 20 lines of the
relevant log (`/tmp/devspace/api.log` or `/tmp/devspace/web.log`) when asking
for help.

## What NOT to touch (yet)

- The `reference_images/` and `screens-library/` folders are design inputs —
  never commit them (they're already gitignored).
- Don't run `git push` or merge branches — the maintainer handles that.
- Never paste API keys or secrets into the terminal where they'd be saved;
  keys go in the repo-root `.env` (gitignored) or as environment variables.
