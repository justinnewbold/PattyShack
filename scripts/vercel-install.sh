#!/usr/bin/env bash
set -euo pipefail

# Always run from repository root
cd "$(dirname "$0")/.."

echo "Installing root dependencies with npm ci..."
npm ci

echo "Installing frontend dependencies with npm ci..."
npm ci --prefix frontend
