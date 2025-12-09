# Security Guide

This document outlines security best practices, audit procedures, and guidelines for the Aura-Sign MVP project.

---

## Table of Contents

1. [Security Overview](#security-overview)
2. [Authentication & Authorization](#authentication--authorization)
3. [Secret Management](#secret-management)
4. [Data Protection](#data-protection)
5. [API Security](#api-security)
6. [Dependency Management](#dependency-management)
7. [Audit Procedures](#audit-procedures)
8. [Incident Response](#incident-response)
9. [Security Checklist](#security-checklist)

---

## Security Overview

Aura-Sign MVP implements wallet-based authentication using Sign-In with Ethereum (SIWE). Security is paramount as the system handles:

- User wallet addresses and signatures
- Session tokens
- Potentially sensitive user data
- Cryptographic operations

### Security Principles

1. **Defense in Depth**: Multiple layers of security controls
2. **Least Privilege**: Minimal access rights for users and services
3. **Secure by Default**: Security features enabled out of the box
4. **Zero Trust**: Never trust, always verify
5. **Privacy by Design**: Data protection built into architecture

---

## Authentication & Authorization

### SIWE (Sign-In with Ethereum)

The project uses SIWE for wallet-based authentication. This eliminates password-related vulnerabilities.

#### Nonce Security

**Critical**: Always verify SIWE nonces server-side to prevent replay attacks.

```typescript
// ✅ CORRECT: Server-side nonce verification
import { SiweMessage } from 'siwe';

async function verifySignature(message: string, signature: string) {
  const siweMessage = new SiweMessage(message);

  // Verify nonce exists and hasn't been used
  const nonce = await getNonceFromDB(siweMessage.nonce);
  if (!nonce || nonce.used) {
    throw new Error('Invalid or used nonce');
  }

  // Verify signature
  await siweMessage.verify({ signature });

  // Mark nonce as used
  await markNonceAsUsed(siweMessage.nonce);

  return siweMessage.address;
}
```

```typescript
// ❌ INCORRECT: No nonce verification
async function verifySignature(message: string, signature: string) {
  const siweMessage = new SiweMessage(message);
  await siweMessage.verify({ signature });
  return siweMessage.address; // Vulnerable to replay attacks!
}
```

#### Nonce Requirements

- **Generate unique nonces**: Use cryptographically secure random generation
- **One-time use**: Mark nonces as used after verification
- **Expiration**: Set nonce expiration (e.g., 5 minutes)
- **Storage**: Store nonces server-side (database or Redis)

```typescript
// Generate secure nonce
import { randomBytes } from 'crypto';

function generateNonce(): string {
  return randomBytes(32).toString('hex');
}

// Store with expiration
await redis.setex(
  `nonce:${nonce}`,
  300, // 5 minutes
  JSON.stringify({ used: false, created: Date.now() })
);
```

### Session Management

#### Iron-Session Configuration

The project uses `iron-session` for secure, encrypted sessions.

**Secure Configuration**:

```typescript
import { getIronSession } from 'iron-session';

const sessionOptions = {
  password: process.env.IRON_SESSION_PASSWORD!, // Min 32 characters
  cookieName: 'aura_session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Prevent XSS
    sameSite: 'lax' as const, // CSRF protection
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};
```

#### Session Security Rules

1. **Password Length**: Minimum 32 characters, use `openssl rand -base64 48`
2. **HTTPS Only**: Set `secure: true` in production
3. **HttpOnly**: Always enable to prevent XSS attacks
4. **SameSite**: Use 'lax' or 'strict' for CSRF protection
5. **Short TTL**: Consider shorter session lifetimes for sensitive operations
6. **Session Rotation**: Rotate session IDs on privilege escalation

### Private Key Handling

**Critical Security Rule**: Never store or log private keys.

```typescript
// ❌ NEVER DO THIS
console.log('Private key:', privateKey);
await database.save({ privateKey });
localStorage.setItem('privateKey', key);

// ✅ CORRECT: Users manage their own keys via wallets
// The application never handles private keys
const signature = await wallet.signMessage(message);
```

---

## Secret Management

### Environment Variables

**Never commit secrets to version control.**

#### Development

Use `.env` file (already in `.gitignore`):

```bash
# .env (local only)
SESSION_SECRET=development_secret_32_chars_min
IRON_SESSION_PASSWORD=development_password_32_chars_minimum
DATABASE_URL=postgresql://localhost:5432/aura_dev
```

#### Production

Use a secret management system:

- **HashiCorp Vault**: Recommended for production
- **AWS Secrets Manager**: For AWS deployments
- **Google Secret Manager**: For GCP deployments
- **Azure Key Vault**: For Azure deployments

**Example with Vault**:

```bash
# Store secrets in Vault
vault kv put secret/aura/production \
  SESSION_SECRET="$(openssl rand -base64 32)" \
  IRON_SESSION_PASSWORD="$(openssl rand -base64 48)" \
  DATABASE_URL="postgresql://..."

# Retrieve in application
vault kv get -field=SESSION_SECRET secret/aura/production
```

### Secret Rotation

Implement regular secret rotation:

1. **Session Secrets**: Rotate every 90 days
2. **Database Passwords**: Rotate every 90 days
3. **API Keys**: Rotate when team members leave
4. **Immediate Rotation**: On suspected compromise

**Rotation Procedure**:

1. Generate new secret
2. Deploy new secret alongside old (dual-key period)
3. Monitor for issues
4. Remove old secret after grace period (e.g., 24 hours)

---

## Data Protection

### Sensitive Data Classification

| Category         | Examples                     | Protection Required             |
| ---------------- | ---------------------------- | ------------------------------- |
| **Critical**     | Private keys (never stored)  | N/A - Never handle              |
| **Sensitive**    | Wallet addresses, signatures | Encryption at rest, access logs |
| **Confidential** | User metadata, embeddings    | Encryption at rest              |
| **Public**       | Public profiles              | Standard security               |

### Encryption at Rest

#### Database Encryption

Enable encryption for sensitive data:

```typescript
// Using Prisma with PostgreSQL pgcrypto
model User {
  id       String @id @default(uuid())
  address  String // Public wallet address - no encryption needed

  // Sensitive data - encrypt if storing
  @@index([address])
}
```

For PostgreSQL, enable encryption at the cluster level:

```bash
# PostgreSQL configuration
# Enable SSL/TLS
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'
```

#### Storage Encryption

**MinIO/S3**: Enable server-side encryption:

```typescript
// S3 encryption
const params = {
  Bucket: 'aura-data',
  Key: 'embeddings/data.bin',
  Body: data,
  ServerSideEncryption: 'AES256', // or 'aws:kms'
};

await s3.putObject(params);
```

### Encryption in Transit

**Always use HTTPS/TLS in production.**

```nginx
# nginx configuration
server {
  listen 443 ssl http2;
  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;
  ssl_protocols TLSv1.2 TLSv1.3;
  ssl_ciphers HIGH:!aNULL:!MD5;
}
```

### Data Retention

Implement data retention policies:

```typescript
// Example: Delete old embeddings after 90 days
async function cleanupOldData() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);

  await prisma.embedding.deleteMany({
    where: {
      created_at: {
        lt: cutoffDate,
      },
    },
  });
}
```

---

## API Security

### Rate Limiting

Implement rate limiting to prevent abuse:

```typescript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/api/', limiter);
```

### Input Validation

**Always validate and sanitize user input.**

```typescript
import { z } from 'zod';

// Define schema
const SignatureSchema = z.object({
  message: z.string().min(1).max(1000),
  signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/),
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

// Validate input
app.post('/api/verify', async (req, res) => {
  try {
    const data = SignatureSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    return res.status(400).json({ error: 'Invalid input' });
  }
});
```

### CORS Configuration

Configure CORS restrictively:

```typescript
import cors from 'cors';

const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
```

### SQL Injection Prevention

**Always use parameterized queries** (Prisma does this by default):

```typescript
// ✅ CORRECT: Prisma uses parameterized queries
await prisma.user.findUnique({
  where: { address: userAddress },
});

// ❌ INCORRECT: Raw SQL without parameters
await prisma.$queryRawUnsafe(`SELECT * FROM users WHERE address = '${userAddress}'`);

// ✅ CORRECT: Raw SQL with parameters
await prisma.$queryRaw`
  SELECT * FROM users WHERE address = ${userAddress}
`;
```

### XSS Prevention

Prevent Cross-Site Scripting:

```typescript
// Use Content Security Policy
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});

// Escape user content in React (automatic with JSX)
function UserProfile({ username }: { username: string }) {
  return <div>{username}</div>; // Automatically escaped
}
```

---

## Dependency Management

### Dependency Scanning

Enable Dependabot in GitHub:

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
```

### Regular Audits

Run security audits regularly:

```bash
# Using pnpm audit
pnpm audit

# Fix vulnerabilities
pnpm audit --fix

# Check for outdated packages
pnpm outdated
```

### Automated Scanning in CI

Add to GitHub Actions:

```yaml
# .github/workflows/security-audit.yml
name: Security Audit
on:
  schedule:
    - cron: '0 0 * * 1' # Weekly
  push:
    branches: [main]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8.15.0
      - run: pnpm audit
```

### Third-Party Packages

Before adding new dependencies:

1. **Check npm security advisories**
2. **Review package maintenance status**
3. **Check download statistics**
4. **Review source code for suspicious activity**
5. **Use exact versions in production**

---

## Audit Procedures

### Security Audit Checklist

#### Pre-Release Audit

- [ ] Run `pnpm audit` and resolve all vulnerabilities
- [ ] Verify all secrets are in environment variables, not code
- [ ] Check that HTTPS is enforced in production
- [ ] Verify session configuration is secure
- [ ] Test authentication flows for vulnerabilities
- [ ] Review CORS and CSP headers
- [ ] Verify input validation on all endpoints
- [ ] Check rate limiting is configured
- [ ] Review database query patterns for SQL injection
- [ ] Verify encryption at rest is enabled
- [ ] Check audit logging is implemented

#### Post-Release Audit

- [ ] Monitor security logs for suspicious activity
- [ ] Review access logs for unauthorized attempts
- [ ] Check for exposed secrets in logs
- [ ] Verify backup encryption
- [ ] Review user reported security issues
- [ ] Check compliance with data retention policies

### Code Review Security Checklist

For every PR:

- [ ] No secrets committed
- [ ] Input validation present
- [ ] Authentication/authorization checks in place
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include sensitive data
- [ ] Dependencies are up to date

### Penetration Testing

Conduct regular penetration testing:

1. **Quarterly**: Internal security review
2. **Annually**: External penetration test
3. **Pre-Launch**: Comprehensive security audit

**Test Areas**:

- Authentication bypass attempts
- Session hijacking
- SQL injection
- XSS attacks
- CSRF attacks
- Rate limiting effectiveness
- API security

---

## Incident Response

### Security Incident Procedure

1. **Detect**: Identify the security incident
2. **Contain**: Isolate affected systems
3. **Investigate**: Determine scope and impact
4. **Remediate**: Fix the vulnerability
5. **Recover**: Restore normal operations
6. **Review**: Post-incident analysis

### Incident Response Team

Define roles:

- **Incident Commander**: Coordinates response
- **Technical Lead**: Implements fixes
- **Communications Lead**: Handles notifications
- **Legal Advisor**: Ensures compliance

### Breach Notification

If user data is compromised:

1. **Assess Impact**: Determine what data was accessed
2. **Legal Review**: Consult legal team
3. **User Notification**: Notify affected users within required timeframe
4. **Regulatory Notification**: Report to authorities if required (e.g., GDPR)
5. **Public Statement**: Issue statement if necessary

### Incident Log Template

```markdown
## Security Incident: [Title]

**Date**: YYYY-MM-DD
**Severity**: Critical / High / Medium / Low
**Status**: Open / Investigating / Resolved

### Summary

Brief description of the incident.

### Timeline

- HH:MM - Incident detected
- HH:MM - Team notified
- HH:MM - Containment implemented
- HH:MM - Fix deployed
- HH:MM - Incident closed

### Impact

- Systems affected
- Data compromised
- Users impacted

### Root Cause

What caused the incident.

### Remediation

What was done to fix it.

### Prevention

Steps to prevent recurrence.
```

---

## Security Checklist

### Development

- [ ] Use SIWE for authentication
- [ ] Verify nonces server-side
- [ ] Never log private keys or secrets
- [ ] Use parameterized queries
- [ ] Validate all user input
- [ ] Escape output to prevent XSS
- [ ] Use TypeScript strict mode
- [ ] Enable ESLint security rules

### Deployment

- [ ] Use HTTPS in production
- [ ] Enable httpOnly and secure cookies
- [ ] Configure CORS restrictively
- [ ] Set up rate limiting
- [ ] Enable database encryption
- [ ] Use secret management system (Vault/KMS)
- [ ] Configure CSP headers
- [ ] Enable audit logging

### Operations

- [ ] Run weekly security audits
- [ ] Monitor security logs
- [ ] Rotate secrets quarterly
- [ ] Keep dependencies updated
- [ ] Review access logs
- [ ] Backup with encryption
- [ ] Test disaster recovery
- [ ] Conduct security training

### Monitoring

- [ ] Set up alerts for failed auth attempts
- [ ] Monitor for unusual API patterns
- [ ] Track rate limit violations
- [ ] Alert on audit log anomalies
- [ ] Monitor dependency vulnerabilities
- [ ] Track session anomalies

---

## Additional Resources

- **SIWE Specification**: https://eips.ethereum.org/EIPS/eip-4361
- **OWASP Top 10**: https://owasp.org/www-project-top-ten/
- **OWASP API Security**: https://owasp.org/www-project-api-security/
- **CWE Top 25**: https://cwe.mitre.org/top25/
- **NIST Cybersecurity Framework**: https://www.nist.gov/cyberframework

---

## Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email security contacts directly
3. Provide detailed information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if known)

We aim to respond to security reports within 48 hours.

---

## Compliance

### GDPR Considerations

If operating in EU:

- Implement data subject access requests (DSAR)
- Enable right to erasure (delete user data)
- Maintain data processing records
- Implement privacy by design
- Conduct data protection impact assessments (DPIA)

### Best Practices

- **Principle of Least Privilege**: Grant minimum necessary access
- **Defense in Depth**: Layer security controls
- **Fail Securely**: Default to secure state on errors
- **Complete Mediation**: Check every access
- **Open Design**: Security through design, not obscurity
- **Separation of Privilege**: Multiple conditions for access
- **Audit Trail**: Log security-relevant events

---

**Last Updated**: 2025-12-06

This security guide should be reviewed and updated regularly as new threats emerge and the application evolves.
