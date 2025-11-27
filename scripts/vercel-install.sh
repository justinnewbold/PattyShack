#!/usr/bin/env sh
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Install backend/serverless dependencies from the project root.
echo "Installing root dependencies..."
cd "$PROJECT_ROOT"
npm install

# Install frontend dependencies if the directory exists.
if [ -d "$PROJECT_ROOT/frontend" ]; then
  echo "Installing frontend dependencies..."
  cd "$PROJECT_ROOT/frontend"
  npm install
else
  echo "frontend directory not found at $PROJECT_ROOT/frontend" >&2
  exit 1
fi
