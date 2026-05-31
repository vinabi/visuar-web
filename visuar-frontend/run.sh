#!/usr/bin/env bash
# Start VISUAR frontend (from visuar-frontend directory)
set -e
cd "$(dirname "$0")"

if [[ ! -d node_modules ]]; then
  npm install
fi

echo "Starting frontend at http://localhost:5173"
exec npm run dev
