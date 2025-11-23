#!/bin/bash
set -euo pipefail

echo "Checking for outdated dependencies..."
OUTDATED_OUTPUT=$(pnpm outdated 2>&1) || OUTDATED_EXIT_CODE=$?
if [ "${OUTDATED_EXIT_CODE:-0}" -ne 0 ] && [ "${OUTDATED_EXIT_CODE:-0}" -ne 1 ]; then
  echo "✗ ERROR: Failed to check for outdated dependencies (exit code: ${OUTDATED_EXIT_CODE})"
  echo "Command output:"
  echo "$OUTDATED_OUTPUT"
  exit 1
fi

# pnpm outdated returns exit code 1 when outdated packages are found (which is expected)
# Exit code 0 means all packages are up to date
if [ "${OUTDATED_EXIT_CODE:-0}" -eq 0 ]; then
  echo "✓ All dependencies are up to date"
else
  echo "✗ ERROR: Found outdated dependencies:"
  echo "$OUTDATED_OUTPUT"
  exit 1
fi

echo ""
echo "Checking for vulnerabilities..."
AUDIT_OUTPUT=$(pnpm audit --audit-level moderate 2>&1) || AUDIT_EXIT_CODE=$?
if [ "${AUDIT_EXIT_CODE:-0}" -ne 0 ] && [ "${AUDIT_EXIT_CODE:-0}" -ne 1 ]; then
  echo "✗ ERROR: Failed to run security audit (exit code: ${AUDIT_EXIT_CODE})"
  echo "Command output:"
  echo "$AUDIT_OUTPUT"
  exit 1
fi

# pnpm audit returns exit code 1 when vulnerabilities are found (which is expected)
if echo "$AUDIT_OUTPUT" | grep -q "No known vulnerabilities found"; then
  echo "✓ No vulnerabilities found"
else
  echo "✗ ERROR: Vulnerabilities found:"
  echo "$AUDIT_OUTPUT"
  exit 1
fi

echo ""
echo "✓ Health check passed!"

