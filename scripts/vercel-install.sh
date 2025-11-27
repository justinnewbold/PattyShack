#!/usr/bin/env bash
set -euo pipefail

# Always run from repository root for consistent installs
cd "$(dirname "$0")/.."

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
