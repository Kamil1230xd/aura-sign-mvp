#!/usr/bin/env bash
# Setup pre-commit hooks for secret detection
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
HOOKS_DIR="$REPO_ROOT/.git/hooks"

echo "🔧 Setting up pre-commit hooks for Aura-Sign MVP"
echo "================================================"

# Check if we're in a git repository
if [ ! -d "$REPO_ROOT/.git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Check if gitleaks is installed
if ! command -v gitleaks >/dev/null 2>&1; then
    echo "⚠️  Gitleaks is not installed"
    echo ""
    echo "To install gitleaks:"
    echo "  - macOS: brew install gitleaks"
    echo "  - Linux: Download from https://github.com/gitleaks/gitleaks/releases"
    echo "  - Or use Docker: docker pull zricethezav/gitleaks:latest"
    echo ""
    read -r -p "Continue without gitleaks? (commits will be allowed with a warning) [y/N]: " user_continue
    user_continue=${user_continue:-N}
    if [[ ! "$user_continue" =~ ^(Y|y)$ ]]; then
        echo "Aborting."
        exit 1
    fi
fi

# Create pre-commit hook
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

echo ""
echo "📝 Creating pre-commit hook at: $PRE_COMMIT_HOOK"

cat > "$PRE_COMMIT_HOOK" <<'EOF'
#!/usr/bin/env bash
# Pre-commit hook to detect secrets using gitleaks
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🔍 Running secret detection with gitleaks..."

# Check if gitleaks is installed
if ! command -v gitleaks >/dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Warning: gitleaks is not installed${NC}"
    echo -e "${YELLOW}Secrets will not be detected. Install gitleaks to enable secret scanning.${NC}"
    echo ""
    echo "To install:"
    echo "  - macOS: brew install gitleaks"
    echo "  - Linux: See https://github.com/gitleaks/gitleaks#installing"
    echo ""
    echo "Continuing without secret detection..."
    exit 0
fi

# Get the repository root
REPO_ROOT=$(git rev-parse --show-toplevel)

# Run gitleaks on staged files
if gitleaks protect --staged --config="$REPO_ROOT/.gitleaks.toml" --verbose; then
    echo -e "${GREEN}✅ No secrets detected${NC}"
    exit 0
else
    echo ""
    echo -e "${RED}❌ Secrets detected in staged files!${NC}"
    echo ""
    echo "🔒 Your commit has been blocked because potential secrets were detected."
    echo ""
    echo "What to do:"
    echo "  1. Review the findings above"
    echo "  2. Remove any real secrets from your staged files"
    echo "  3. If it's a false positive, update .gitleaks.toml to allowlist it"
    echo "  4. Use environment variables or .env.local for local secrets"
    echo "  5. Try committing again"
    echo ""
    echo "To temporarily bypass this check (NOT RECOMMENDED):"
    echo "  git commit --no-verify"
    echo ""
    exit 1
fi
EOF

# Make the hook executable
chmod +x "$PRE_COMMIT_HOOK"

echo "✅ Pre-commit hook installed successfully"
echo ""
echo "📋 Hook behavior:"
echo "  - Runs gitleaks on staged files before each commit"
echo "  - Blocks commits if secrets are detected"
echo "  - Allows commits if gitleaks is not installed (with warning)"
echo "  - Can be bypassed with: git commit --no-verify (NOT RECOMMENDED)"
echo ""
echo "🧪 Testing the hook..."
echo ""

# Test if gitleaks is available
if command -v gitleaks >/dev/null 2>&1; then
    echo "Running gitleaks test scan..."
    # Capture output and exit code separately, redact any secrets found
    GITLEAKS_OUTPUT=$(gitleaks detect --config="$REPO_ROOT/.gitleaks.toml" --redact --verbose 2>&1)
    GITLEAKS_EXIT=$?
    echo "$GITLEAKS_OUTPUT" | head -20
    echo ""
    if [ $GITLEAKS_EXIT -eq 0 ]; then
        echo "✅ Gitleaks is working correctly - no secrets detected"
    else
        echo "⚠️  Gitleaks test completed (exit code: $GITLEAKS_EXIT)"
        echo "    This may indicate secrets were found or a configuration issue"
    fi
else
    echo "⚠️  Gitleaks not installed - hook will warn but not block commits"
fi

echo ""
echo "================================================"
echo "✅ Pre-commit hooks setup complete!"
echo ""
echo "Next steps:"
echo "  1. Make a test commit to verify the hook works"
echo "  2. Share this script with your team: ./scripts/setup_pre_commit_hooks.sh"
echo "  3. See docs/SECURITY_SECRETS.md for more information"
echo ""
