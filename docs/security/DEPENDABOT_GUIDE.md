# GitHub Dependabot Configuration Guide

> **Note:** This guide uses placeholders like `:owner/:repo` in commands. Replace these with `Kamil1230xd/aura-sign-mvp` for this repository, or use `gh` CLI's automatic detection by running commands from within the repository directory.

## Overview

GitHub Dependabot is configured to automatically create pull requests for dependency updates and security vulnerabilities. This helps keep the project secure and up-to-date with minimal manual effort.

## Configuration

Dependabot is configured in `.github/dependabot.yml` with the following settings:

### NPM Dependencies

- **Schedule**: Weekly on Mondays at 02:00 UTC
- **Open PR Limit**: Maximum 10 pull requests at once
- **Grouping**: Minor and patch updates are grouped by dependency type (development vs production)
- **Labels**: Automatically tagged with `dependencies` and `security`
- **Reviewers**: @Kamil1230xd is automatically assigned

### GitHub Actions

- **Schedule**: Weekly on Mondays at 02:00 UTC
- **Open PR Limit**: Maximum 5 pull requests at once
- **Labels**: Automatically tagged with `dependencies` and `github-actions`
- **Reviewers**: @Kamil1230xd is automatically assigned

## How It Works

1. **Automated Scanning**: Dependabot scans the repository weekly for outdated dependencies and security vulnerabilities
2. **PR Creation**: Creates pull requests with updates, grouped by type and severity
3. **Automatic Reviews**: Security audit workflow runs automatically on each PR
4. **Manual Review**: Maintainers review and merge approved updates

## Dependency Update Types

### Security Updates

- **Priority**: Immediate attention required
- **Frequency**: Created as soon as vulnerabilities are detected
- **Action**: Review and merge quickly after CI passes

### Version Updates

- **Major Updates**: Created individually, require manual review and testing
- **Minor/Patch Updates**: Grouped together for easier review
- **Action**: Review changelog, test, and merge

## Reviewing Dependabot PRs

### Quick Review Checklist

1. **Check PR Title and Description**
   - Review what's being updated and why
   - Check if it's a security update (high priority)

2. **Review Release Notes**
   - Click the changelog link in the PR description
   - Look for breaking changes
   - Check for new security features

3. **Verify CI Checks**
   - Ensure all tests pass
   - Check security audit results
   - Review code scanning alerts

4. **Test Locally (for major updates)**
   ```bash
   # Check out the PR branch
   gh pr checkout <PR_NUMBER>
   
   # Install dependencies
   pnpm install
   
   # Run tests
   pnpm test
   
   # Build project
   pnpm build
   ```

5. **Merge Strategy**
   - Security updates: Merge immediately after CI passes
   - Minor/patch updates: Can be merged in batches
   - Major updates: Thorough testing recommended

## Managing Dependabot

### Pausing Updates

To temporarily pause Dependabot updates:

```bash
# Simplest method: Edit .github/dependabot.yml
# Change schedule interval to "monthly" or remove the configuration

# Or disable Dependabot via repository settings:
# Settings → Code security and analysis → Dependabot → Disable
```

### Ignoring Specific Dependencies

To ignore a specific dependency from Dependabot updates, add to `.github/dependabot.yml`:

```yaml
- package-ecosystem: "npm"
  directory: "/"
  ignore:
    - dependency-name: "package-name"
      versions: ["1.x", "2.x"]  # or [">=1.0.0"]
```

### Adjusting Update Frequency

Current frequency is weekly. To change:

```yaml
schedule:
  interval: "daily"    # daily, weekly, monthly
  day: "monday"        # for weekly
  time: "02:00"
  timezone: "UTC"
```

## Common Scenarios

### Scenario 1: Security Vulnerability Detected

**Action Plan:**
1. Dependabot creates PR immediately (not waiting for weekly schedule)
2. Review PR urgency based on severity (critical/high/medium/low)
3. Review changelog and breaking changes
4. Merge PR after CI passes
5. Deploy to production if critical

**Timeline:**
- Critical: Within 24 hours
- High: Within 7 days
- Medium: Within 30 days
- Low: Next release cycle

### Scenario 2: Major Version Update

**Action Plan:**
1. Dependabot creates individual PR for major version
2. Review release notes and migration guide
3. Test locally in development environment
4. Update any breaking API usage
5. Run full test suite
6. Deploy to staging first
7. Monitor for issues
8. Deploy to production

**Timeline:** 1-2 weeks depending on complexity

### Scenario 3: Multiple Grouped Updates

**Action Plan:**
1. Dependabot groups minor/patch updates in single PR
2. Review all updates in the group
3. Check for any conflicts or issues
4. Merge after CI passes
5. Monitor production for any issues

**Timeline:** 1-3 days

## Monitoring Dependabot Activity

### Via GitHub UI

1. Go to repository → Insights → Dependency graph → Dependabot
2. View open pull requests
3. Check update schedule
4. Review security alerts

### Via GitHub CLI

```bash
# List Dependabot PRs
gh pr list --label dependencies

# View Dependabot alerts
gh api repos/:owner/:repo/dependabot/alerts

# List security advisories
gh api repos/:owner/:repo/security-advisories
```

## Integration with Security Audit

Dependabot PRs automatically trigger:
- Security audit script (`scripts/security_audit.sh`)
- Dependency review action
- CodeQL scanning (if enabled)

All security checks must pass before merging.

## Troubleshooting

### Dependabot Not Creating PRs

**Possible Causes:**
1. Maximum open PRs reached (limit: 10 for npm, 5 for actions)
2. Configuration file has syntax errors
3. Repository permissions issue

**Solution:**
```bash
# Validate configuration file syntax
yamllint .github/dependabot.yml

# Check Dependabot status in repository settings
# Settings → Code security and analysis → Dependabot

# View Dependabot alerts to confirm it's working
gh api repos/:owner/:repo/dependabot/alerts
```

### Conflicting PRs

**Solution:**
1. Close older PRs that update the same dependency
2. Dependabot will recreate PR with latest version
3. Or manually resolve conflicts and update PR

### Failed Checks

**Solution:**
1. Review CI logs for failure reason
2. Check if it's a dependency issue or test issue
3. Fix tests if they need updating
4. Close PR if update causes breaking changes

## Best Practices

1. **Review Regularly**: Check Dependabot PRs at least weekly
2. **Group Related Updates**: Use grouping for easier review
3. **Test Major Updates**: Always test major version updates in staging
4. **Keep Limits Reasonable**: Don't overwhelm reviewers with too many PRs
5. **Monitor After Merge**: Watch for issues after merging updates
6. **Document Decisions**: Comment on PRs when choosing to delay or skip updates

## Resources

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Configuration Options](https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file)
- [Dependabot Alerts](https://docs.github.com/en/code-security/dependabot/dependabot-alerts)

## Summary

Dependabot is a powerful tool for maintaining dependency security and freshness. By following this guide and the configured schedule, the project will stay up-to-date with minimal manual effort while maintaining security and stability.

**Next Review:** Check Dependabot PRs every Monday after 02:00 UTC
