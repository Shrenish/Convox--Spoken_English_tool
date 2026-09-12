# CONVOX — one-command environment setup (backend + frontend).
# Run from the repo root:  ./setup.sh   (Git Bash)   or   .\setup.ps1  (Windows PowerShell)
#
# Installs:
#   backend  → venv + pip install -r requirements.txt + pytest suite
#   frontend → npm install
# Leaves `.env` for you to fill (see backend/.env.example).

set -e
cd "$(dirname "$0")"

echo "==> CONVOX setup start"

# Backend
echo "==> Backend: creating venv + installing deps"
cd backend
if [ ! -d ".venv" ]; then
  py -m venv .venv
fi
PY=".venv/Scripts/python"
"$PY" -m pip install --upgrade pip >/dev/null
"$PY" -m pip install -r requirements.txt

echo "==> Backend: running tests (no API keys required — model is stubbed)"
"$PY" -m pytest -q

# Frontend
echo "==> Frontend: installing deps"
cd ../frontend
npm install
echo "==> Frontend: building (TypeScript + production bundle)"
npm run build

if [ ! -f "../backend/.env" ]; then
  echo ""
  echo "==> Next: copy backend/.env.example to backend/.env and paste your API keys."
fi
echo "==> Done. Run:"
echo "    cd backend && .venv\\Scripts\\python -m uvicorn app.main:app --reload --port 8000"
echo "    cd frontend && npm run dev"