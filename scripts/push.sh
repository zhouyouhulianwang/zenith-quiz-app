#!/bin/bash
# Usage: ./scripts/push.sh "commit message"
set -e
MSG="${1:-update}"
shift || true
FILES="$@"

if [ -z "$FILES" ]; then
  # Auto-detect changed source files
  FILES=$(cd /mnt/agents/output/app && python3 -c "
import os, hashlib
files = [
  'api/mock-exam-router.ts',
  'api/queries/connection.ts',
  'api/bank-router.ts',
  'api/boot.ts',
  'api/lib/cookies.ts',
  'api/simple-auth-router.ts',
  'api/router.ts',
  'src/pages/TrainingPage.tsx',
  'src/pages/LibraryPage.tsx',
  'src/pages/MockExamCreatePage.tsx',
  'src/pages/ExamSetupPage.tsx',
  'src/pages/MockExamListPage.tsx',
]
for f in files:
  p = f'/mnt/agents/output/app/{f}'
  if os.path.exists(p):
    print(f)
" | xargs)
fi

echo "Pushing: $MSG"
echo "Files: $FILES"
python3 /mnt/agents/output/app/scripts/auto-push-github.py "$MSG" $FILES
