#!/bin/bash
# scripts/check-no-raw-logging.sh
# Fails if console.log or console.error is used outside src/lib/logger.ts
# Also fails if client_secret, access_token, or dlt_access_token literals are used outside src/lib/*.ts

EXIT_CODE=0

# Check for raw console logs
LOG_MATCHES=$(grep -rnw 'src' -e 'console\.log' -e 'console\.error' | grep -v 'lib/logger.ts' | grep -v '// eslint-disable')
if [ ! -z "$LOG_MATCHES" ]; then
  echo "Error: Raw console logging found outside src/lib/logger.ts:"
  echo "$LOG_MATCHES"
  echo "Use logEvent or sanitizeError instead."
  EXIT_CODE=1
fi

# Check for bare secrets in non-lib files
SECRET_MATCHES=$(grep -rnE 'client_secret|access_token|dlt_access_token' src | grep -v 'src/lib/')
if [ ! -z "$SECRET_MATCHES" ]; then
  echo "Error: Sensitive token names found outside src/lib/*.ts:"
  echo "$SECRET_MATCHES"
  echo "Tokens should only be handled in core library files."
  EXIT_CODE=1
fi

if [ $EXIT_CODE -eq 0 ]; then
  echo "Code guard checks passed."
fi

exit $EXIT_CODE
