#!/bin/bash
set -euo pipefail

echo "Running check.sh..."
./check.sh

echo ""
echo "Running health.sh..."
./health.sh

echo ""
echo "All checks passed!"

