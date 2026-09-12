#!/usr/bin/env bash
# CONVOX — init git (if needed) + push to a NEW public GitHub repo "convox".
# Run from the repo root:  ./git_push.sh   (Git Bash)
#
# Requires the GitHub CLI (`gh`) authenticated. If it isn't:
#     gh auth login
# then re-run this script.
#
# Safety: aborts if any live API key is staged (a key would end up public).

set -e
cd "$(dirname "$0")"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "==> Initializing git repo (branch main)"
  git init -b main
fi

echo "==> Staging everything (respecting .gitignore)"
git add -A

echo "==> Secret gate: scanning staged files for live API keys"
if git grep -n -E 'sk-proj-[A-Za-z0-9]{8}|sk-ant-[A-Za-z0-9]{8}|gsk_[A-Za-z0-9]{8}|AIza[0-9A-Za-z_-]{8}' --cached >/dev/null 2>&1; then
  echo "!! Live API key detected in files about to be committed — aborting."
  echo "   Rotate the leaked key, remove it from the file(s), then re-run."
  exit 1
fi
echo "    clean — no live keys staged."

if ! git diff --cached --quiet; then
  git commit -m "CONVOX v1: conversation + CORE evaluation + learner model + travel" \
    -m "Voice-first adaptive communication simulator for Indian college students moving from local Indian English to confident global communication.

Backend: FastAPI, SQLAlchemy 2 async, SQLite (WAL). Conversation engine with personas and controlled events; CORE evaluation (14 evidence-linked dimensions); learner model with adaptive difficulty; 8-stage Travel / Global Survival journey. Zero-key pytest suite stubs the evaluation model.
Frontend: Next.js 14 App Router, React 18, TypeScript, Tailwind, MediaRecorder turn-based voice.

Co-Authored-By: Claude Code <noreply@anthropic.com>"
  echo "==> Committed."
else
  echo "==> Nothing new to commit."
fi

if git remote get-url origin >/dev/null 2>&1; then
  echo "==> origin already set — pushing"
  git push -u origin main
else
  echo "==> Creating PUBLIC GitHub repo 'convox' and pushing"
  gh repo create convox --public --source=. --remote=origin --push
fi

echo "==> Done. View it at https://github.com/<your-account>/convox"