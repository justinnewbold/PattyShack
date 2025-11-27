#!/usr/bin/env bash
set -euo pipefail

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
