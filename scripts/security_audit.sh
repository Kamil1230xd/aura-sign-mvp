#!/bin/bash

# Aura-Sign MVP Security Audit Script
# This script performs automated security checks on the project

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPORT_DIR="./audit-reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="${REPORT_DIR}/audit_${TIMESTAMP}.txt"

# Create report directory if it doesn't exist
mkdir -p "${REPORT_DIR}"

# Function to print section headers
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print warning messages
print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Start audit report
{
    echo "======================================"
    echo "Aura-Sign MVP Security Audit Report"
    echo "======================================"
    echo "Date: $(date)"
    echo "Auditor: Automated Script"
    echo ""
} > "${REPORT_FILE}"

print_header "Starting Security Audit"

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    print_error "pnpm is not installed. Please install it first."
    exit 1
fi

print_success "pnpm is installed"

# 1. Dependency Audit
print_header "1. Running Dependency Audit"
{
    echo "## Dependency Audit"
    echo ""
    echo "Running pnpm audit..."
    echo ""
} >> "${REPORT_FILE}"

# Run pnpm audit (non-blocking)
if pnpm audit --json > "${REPORT_DIR}/pnpm_audit_${TIMESTAMP}.json" 2>&1; then
    print_success "No vulnerabilities found in dependencies"
    echo "No vulnerabilities found" >> "${REPORT_FILE}"
else
    AUDIT_EXIT_CODE=$?
    if [ $AUDIT_EXIT_CODE -eq 1 ]; then
        print_error "Vulnerabilities found in dependencies"
        
        # Try to parse and display summary
        if command -v jq &> /dev/null; then
            echo "Parsing audit results..."
            VULNERABILITIES=$(jq -r '.metadata.vulnerabilities' "${REPORT_DIR}/pnpm_audit_${TIMESTAMP}.json" 2>/dev/null || echo "{}")
            echo "Vulnerability Summary:" >> "${REPORT_FILE}"
            echo "${VULNERABILITIES}" >> "${REPORT_FILE}"
            echo ""
        else
            print_warning "jq not installed, cannot parse JSON results"
        fi
    else
        print_warning "Could not run pnpm audit (possibly due to network issues)"
        echo "Audit command failed - check network connectivity" >> "${REPORT_FILE}"
    fi
fi

# 2. Check for outdated dependencies
print_header "2. Checking for Outdated Dependencies"
{
    echo ""
    echo "## Outdated Dependencies"
    echo ""
} >> "${REPORT_FILE}"

if pnpm outdated > "${REPORT_DIR}/outdated_${TIMESTAMP}.txt" 2>&1; then
    print_success "All dependencies are up to date"
    echo "All dependencies are up to date" >> "${REPORT_FILE}"
else
    print_warning "Some dependencies are outdated"
    echo "Outdated dependencies detected. See ${REPORT_DIR}/outdated_${TIMESTAMP}.txt for details" >> "${REPORT_FILE}"
fi

# 3. Check for sensitive files
print_header "3. Checking for Sensitive Files"
{
    echo ""
    echo "## Sensitive Files Check"
    echo ""
} >> "${REPORT_FILE}"

SENSITIVE_PATTERNS=(
    "*.pem"
    "*.key"
    "*.p12"
    "*.pfx"
    "*.env"
    ".env.*"
    "id_rsa"
    "id_dsa"
    "*.keystore"
)

FOUND_SENSITIVE=0
for pattern in "${SENSITIVE_PATTERNS[@]}"; do
    # Exclude node_modules and .git directories
    FILES=$(find . -name "${pattern}" -not -path "*/node_modules/*" -not -path "*/.git/*" -type f 2>/dev/null)
    if [ -n "$FILES" ]; then
        print_warning "Found potential sensitive files matching ${pattern}"
        echo "Files matching ${pattern}:" >> "${REPORT_FILE}"
        echo "$FILES" >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
        FOUND_SENSITIVE=1
    fi
done

if [ $FOUND_SENSITIVE -eq 0 ]; then
    print_success "No obvious sensitive files found in repository"
    echo "No sensitive files detected" >> "${REPORT_FILE}"
fi

# 4. Check for hardcoded secrets (basic patterns)
print_header "4. Scanning for Hardcoded Secrets"
{
    echo ""
    echo "## Hardcoded Secrets Scan"
    echo ""
} >> "${REPORT_FILE}"

SECRET_PATTERNS=(
    "password\s*=\s*['\"][^'\"]{4,}['\"]"
    "api[_-]?key\s*=\s*['\"][^'\"]{10,}['\"]"
    "secret\s*=\s*['\"][^'\"]{8,}['\"]"
    "token\s*=\s*['\"][^'\"]{10,}['\"]"
    "private[_-]?key\s*=\s*['\"][^'\"]{10,}['\"]"
)

FOUND_SECRETS=0
for pattern in "${SECRET_PATTERNS[@]}"; do
    # Search in TypeScript, JavaScript, and JSON files, excluding node_modules
    MATCHES=$(grep -r -i -E "${pattern}" \
        --include="*.ts" \
        --include="*.js" \
        --include="*.json" \
        --exclude-dir="node_modules" \
        --exclude-dir=".git" \
        --exclude-dir="dist" \
        . 2>/dev/null || true)
    
    if [ -n "$MATCHES" ]; then
        print_warning "Potential hardcoded secret found (pattern: ${pattern})"
        echo "Pattern: ${pattern}" >> "${REPORT_FILE}"
        echo "$MATCHES" | head -20 >> "${REPORT_FILE}"
        echo "" >> "${REPORT_FILE}"
        FOUND_SECRETS=1
    fi
done

if [ $FOUND_SECRETS -eq 0 ]; then
    print_success "No obvious hardcoded secrets detected"
    echo "No hardcoded secrets detected" >> "${REPORT_FILE}"
else
    print_warning "Please review potential secrets manually"
fi

# 5. Check TypeScript configuration
print_header "5. Checking TypeScript Security Configuration"
{
    echo ""
    echo "## TypeScript Configuration"
    echo ""
} >> "${REPORT_FILE}"

if [ -f "tsconfig.json" ]; then
    # Check for strict mode (which includes noImplicitAny)
    if grep -q '"strict":\s*true' tsconfig.json; then
        print_success "TypeScript strict mode is enabled (includes noImplicitAny, strictNullChecks, etc.)"
        echo "✓ Strict mode enabled (includes noImplicitAny)" >> "${REPORT_FILE}"
    else
        print_warning "TypeScript strict mode is not enabled"
        echo "⚠ Strict mode not enabled - consider enabling for better type safety" >> "${REPORT_FILE}"
        
        # Only check noImplicitAny if strict mode is not enabled
        if grep -q '"noImplicitAny":\s*true' tsconfig.json; then
            print_success "noImplicitAny is enabled"
            echo "✓ noImplicitAny enabled" >> "${REPORT_FILE}"
        else
            print_warning "noImplicitAny is not enabled"
            echo "⚠ noImplicitAny not enabled" >> "${REPORT_FILE}"
        fi
    fi
else
    print_warning "tsconfig.json not found in root"
    echo "tsconfig.json not found" >> "${REPORT_FILE}"
fi

# 6. Check for git ignored files
print_header "6. Checking .gitignore Configuration"
{
    echo ""
    echo "## .gitignore Configuration"
    echo ""
} >> "${REPORT_FILE}"

IMPORTANT_IGNORES=(
    ".env"
    "*.env"
    ".env.local"
    "*.pem"
    "*.key"
    "node_modules"
)

if [ -f ".gitignore" ]; then
    MISSING_IGNORES=()
    for ignore in "${IMPORTANT_IGNORES[@]}"; do
        if ! grep -q "^${ignore}$" .gitignore; then
            MISSING_IGNORES+=("${ignore}")
        fi
    done
    
    if [ ${#MISSING_IGNORES[@]} -eq 0 ]; then
        print_success "All important patterns are in .gitignore"
        echo "✓ .gitignore properly configured" >> "${REPORT_FILE}"
    else
        print_warning "Some important patterns missing from .gitignore"
        echo "⚠ Missing patterns:" >> "${REPORT_FILE}"
        printf '%s\n' "${MISSING_IGNORES[@]}" >> "${REPORT_FILE}"
    fi
else
    print_error ".gitignore file not found"
    echo "✗ .gitignore file not found" >> "${REPORT_FILE}"
fi

# 7. Check package.json scripts for security
print_header "7. Checking Package.json Scripts"
{
    echo ""
    echo "## Package.json Scripts Security"
    echo ""
} >> "${REPORT_FILE}"

SUSPICIOUS_SCRIPT_PATTERNS=(
    "curl.*|.*bash"
    "wget.*|.*bash"
    "rm\s+-rf\s+/"
    "eval"
)

FOUND_SUSPICIOUS=0
for package_json in $(find . -name "package.json" -not -path "*/node_modules/*" -type f); do
    for pattern in "${SUSPICIOUS_SCRIPT_PATTERNS[@]}"; do
        if grep -q "${pattern}" "${package_json}"; then
            print_warning "Suspicious script pattern found in ${package_json}"
            echo "⚠ ${package_json}: Found pattern '${pattern}'" >> "${REPORT_FILE}"
            FOUND_SUSPICIOUS=1
        fi
    done
done

if [ $FOUND_SUSPICIOUS -eq 0 ]; then
    print_success "No suspicious script patterns detected"
    echo "✓ No suspicious scripts detected" >> "${REPORT_FILE}"
fi

# 8. Check for common web3/crypto issues
print_header "8. Web3/Crypto Security Checks"
{
    echo ""
    echo "## Web3/Crypto Security"
    echo ""
} >> "${REPORT_FILE}"

# Check for proper ethers usage
if grep -r "privateKey" --include="*.ts" --include="*.js" --exclude-dir="node_modules" . 2>/dev/null | grep -v "// " | grep -v "/\*" > /dev/null; then
    print_warning "Found references to 'privateKey' - ensure these are handled securely"
    echo "⚠ privateKey references found - review manually" >> "${REPORT_FILE}"
else
    print_success "No obvious private key handling in code"
    echo "✓ No obvious private key issues" >> "${REPORT_FILE}"
fi

# Summary
print_header "Audit Summary"
{
    echo ""
    echo "## Summary"
    echo ""
    echo "Audit completed at: $(date)"
    echo "Full report saved to: ${REPORT_FILE}"
    echo ""
} >> "${REPORT_FILE}"

print_success "Audit completed!"
echo ""
echo "Full report saved to: ${REPORT_FILE}"
echo ""
echo "Next steps:"
echo "1. Review the full report at ${REPORT_FILE}"
echo "2. Address any critical or high-severity issues immediately"
echo "3. Create tickets for medium and low-severity issues"
echo "4. Update documentation with any findings"
echo "5. Schedule next audit"
echo ""

# Exit with error if critical issues found
if [ $FOUND_SECRETS -eq 1 ]; then
    print_warning "Please review potential security issues before deploying"
    exit 1
fi

exit 0
