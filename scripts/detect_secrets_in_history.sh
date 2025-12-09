#!/usr/bin/env bash
set -euo pipefail

# detect_secrets_in_history.sh
# Comprehensive script to scan git history for committed secrets using gitleaks
# Usage: ./scripts/detect_secrets_in_history.sh [branch] [--report REPORT_PATH]

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Git History Secret Scanner"
echo "=============================="
echo ""

# Default values
BRANCH="${1:-}"
REPORT_PATH="gitleaks-history-report.json"
LOG_OPTS="--all"

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --report)
      REPORT_PATH="$2"
      shift 2
      ;;
    --help|-h)
      echo "Usage: $0 [branch] [--report REPORT_PATH]"
      echo ""
      echo "Arguments:"
      echo "  branch          Optional: specific branch to scan (default: all branches)"
      echo "  --report PATH   Optional: path for report file (default: gitleaks-history-report.json)"
      echo ""
      echo "Examples:"
      echo "  $0                           # Scan all branches"
      echo "  $0 main                      # Scan main branch"
      echo "  $0 --report custom.json      # Custom report path"
      echo "  $0 main --report main.json   # Scan main with custom report"
      exit 0
      ;;
    *)
      if [ -z "$BRANCH" ]; then
        BRANCH="$1"
        LOG_OPTS="$BRANCH"
      fi
      shift
      ;;
  esac
done

# Check if gitleaks is installed
if ! command -v gitleaks >/dev/null 2>&1; then
  echo -e "${YELLOW}⚠️  gitleaks is not installed.${NC}"
  echo ""
  echo "Installation options:"
  echo "  macOS:  brew install gitleaks"
  echo "  Linux:  Download from https://github.com/gitleaks/gitleaks/releases"
  echo "  Docker: Use the Docker command below instead"
  echo ""
  echo "Docker alternative:"
  echo "  docker run --rm -v \$(pwd):/path zricethezav/gitleaks:latest detect \\"
  echo "    --source=/path -v --report-path=/path/$REPORT_PATH --log-opts=\"$LOG_OPTS\""
  exit 1
fi

# Verify we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
  echo -e "${RED}❌ Error: Not a git repository${NC}"
  exit 1
fi

# Show scan configuration
echo "Configuration:"
echo "  Branch/Ref: ${BRANCH:-all branches}"
echo "  Report:     $REPORT_PATH"
echo "  Config:     .gitleaks.toml (if exists)"
echo ""

# Check if .gitleaks.toml exists
if [ -f ".gitleaks.toml" ]; then
  echo -e "${GREEN}✓${NC} Found .gitleaks.toml configuration"
else
  echo -e "${YELLOW}⚠${NC}  No .gitleaks.toml found, using default rules"
fi

echo ""
echo "Starting scan of git history..."
echo "This may take a while for large repositories..."
echo ""

# Run gitleaks detect on history
GITLEAKS_RESULT=0
gitleaks detect \
  --source . \
  --verbose \
  --redact \
  --report-path="$REPORT_PATH" \
  --log-opts="$LOG_OPTS" || GITLEAKS_RESULT=$?

echo ""
echo "=============================="

# Interpret results
if [ $GITLEAKS_RESULT -eq 0 ]; then
  echo -e "${GREEN}✅ No secrets detected in git history!${NC}"
  echo ""
  echo "Your repository appears to be clean."
  
  # Clean up empty report if no findings
  if [ -f "$REPORT_PATH" ] && [ ! -s "$REPORT_PATH" ]; then
    rm "$REPORT_PATH"
  fi
  
  exit 0
elif [ $GITLEAKS_RESULT -eq 1 ]; then
  echo -e "${RED}❌ SECRETS DETECTED in git history!${NC}"
  echo ""
  echo "Report saved to: $REPORT_PATH"
  echo ""
  echo "⚠️  CRITICAL: These secrets should be considered COMPROMISED"
  echo ""
  echo "Required actions:"
  echo "  1. Review the report: cat $REPORT_PATH | jq"
  echo "  2. ROTATE all detected secrets immediately"
  echo "  3. Remove secrets from history (see docs/security/SECRET_DETECTION.md)"
  echo "  4. Notify team members if history is rewritten"
  echo ""
  echo "Quick remediation steps:"
  echo "  1. Rotate secrets in all environments"
  echo "  2. Use BFG or git-filter-repo to clean history"
  echo "  3. Force push (coordinate with team):"
  echo "     git push --force --all"
  echo ""
  echo "Documentation: docs/security/SECRET_DETECTION.md"
  
  # Show summary if jq is available
  if command -v jq >/dev/null 2>&1 && [ -f "$REPORT_PATH" ]; then
    echo ""
    echo "Summary of findings:"
    jq -r '.[] | "  - \(.RuleID): \(.File) (commit: \(.Commit)[0:7])"' "$REPORT_PATH" | head -10
    
    TOTAL_FINDINGS=$(jq '. | length' "$REPORT_PATH")
    if [ "$TOTAL_FINDINGS" -gt 10 ]; then
      echo "  ... and $((TOTAL_FINDINGS - 10)) more findings"
    fi
  fi
  
  exit 1
else
  echo -e "${RED}❌ Error: Gitleaks exited with code $GITLEAKS_RESULT${NC}"
  echo ""
  echo "This may indicate a configuration error or other issue."
  echo "Check the output above for details."
  exit $GITLEAKS_RESULT
fi
