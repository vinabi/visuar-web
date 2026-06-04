#!/usr/bin/env bash
# Start VISUAR backend (from visuar-backend directory)
set -e
cd "$(dirname "$0")"

if [[ ! -d venv ]]; then
  python3 -m venv venv
fi
source venv/bin/activate

pip install --upgrade pip -q
pip install --no-compile -r requirements.txt -q

echo "Starting backend at http://localhost:8000"
exec python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
