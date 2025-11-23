#!/bin/bash
set -euo pipefail

echo "Checking for outdated dependencies..."
OUTDATED=$(pnpm outdated 2>&1)
if [ -z "$OUTDATED" ]; then
  echo "All dependencies are up to date"
else
  echo "Found outdated dependencies:"
  echo "$OUTDATED"
  exit 1
fi

echo "Checking for vulnerabilities..."
AUDIT_OUTPUT=$(pnpm audit --audit-level moderate 2>&1)
if echo "$AUDIT_OUTPUT" | grep -q "No known vulnerabilities found"; then
  echo "No vulnerabilities found"
else
  echo "Vulnerabilities found:"
  echo "$AUDIT_OUTPUT"
  exit 1
fi

echo "Health check passed!"

