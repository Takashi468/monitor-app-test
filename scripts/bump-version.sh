#!/bin/bash

# Delegate to the cross-platform Node.js script
SCRIPT_DIR="$(dirname "$0")"
node "$SCRIPT_DIR/bump-version.cjs" "$@"