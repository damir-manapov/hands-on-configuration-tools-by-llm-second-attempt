#!/bin/bash
set -euo pipefail

echo "Running formatting (fixing issues)..."
pnpm format

echo "Checking lint..."
pnpm lint

echo "Checking build (without emitting)..."
pnpm build

echo "Checking gitleaks (including git)..."
pnpm check:gitleaks

echo "Running tests..."
pnpm test

echo "All checks passed!"

