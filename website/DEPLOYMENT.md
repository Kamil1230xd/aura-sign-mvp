# Deployment Guide - Aura-IDToken Epic Website

This guide covers deploying the Aura-IDToken 3D website to various hosting platforms.

## Prerequisites

- Node.js 18+ installed
- npm or pnpm package manager
- Git repository access
- Built website (`npm run build`)

## Quick Deploy Options

### 1. Vercel (Recommended) ⭐

**Why Vercel?**
- Zero configuration required
- Automatic deployments on git push
- Built-in CDN and edge network
- Perfect for Next.js applications
- Free SSL certificates

**Steps:**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy from website directory
cd website
vercel

# Follow the prompts:
# - Link to existing project or create new
# - Confirm framework: Next.js
# - Deploy!
```

**Or use Vercel GitHub Integration:**
1. Go to [vercel.com](https://vercel.com)
2. Import your GitHub repository
3. Set root directory to `website/`
4. Click Deploy

**Environment Variables:** None required for this static site

---

### 2. GitHub Pages

**Steps:**

```bash
# Build and export static site
cd website
npm run export

# The static files are now in the 'out/' directory
# Option A: Manual upload
# - Go to your GitHub repo settings
# - Enable GitHub Pages
# - Upload contents of 'out/' to gh-pages branch

# Option B: Using gh-pages package
npm install -g gh-pages
gh-pages -d out
```

**Custom Domain:**
- Add a `CNAME` file to the `public/` directory
- Add your domain in GitHub repo settings

**Note:** GitHub Pages serves from root or `/docs`, so you may need to adjust the Next.js `basePath` in `next.config.js` if deploying to a subpath.

---

### 3. Cloudflare Pages

**Why Cloudflare Pages?**
- Global CDN with 250+ locations
- Unlimited bandwidth
- Fast build times
- Free SSL and DDoS protection

**Steps:**

1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect your GitHub repository
3. Configure build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `.next`
   - **Root directory:** `website`
4. Click "Save and Deploy"

**Or use Wrangler CLI:**

```bash
npm install -g wrangler
cd website
npm run build
npx wrangler pages publish .next
```

---

### 4. Netlify

**Steps:**

1. Go to [netlify.com](https://netlify.com)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git repository
4. Configure build settings:
   - **Base directory:** `website`
   - **Build command:** `npm run build`
   - **Publish directory:** `.next`
5. Click "Deploy site"

**Or use Netlify CLI:**

```bash
npm install -g netlify-cli
cd website
npm run build
netlify deploy --prod
```

---

### 5. Static Hosting (AWS S3, DigitalOcean Spaces, etc.)

For generic static hosting:

```bash
# Build and export
cd website
npm run export

# The 'out/' directory contains static files
# Upload these to your hosting provider:
# - AWS S3 bucket (with CloudFront)
# - DigitalOcean Spaces
# - Azure Blob Storage
# - Google Cloud Storage

# Example with AWS S3:
aws s3 sync out/ s3://your-bucket-name --delete
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

---

## Performance Optimizations for Production

### 1. Image Optimization

If you add images later:

```javascript
// Use next/image component
import Image from 'next/image';

<Image
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority // for above-the-fold images
/>
```

### 2. Font Optimization

Already configured in `_document.tsx` with:
- Preconnect to Google Fonts
- Display swap for faster rendering

### 3. Bundle Analysis

```bash
# Install bundle analyzer
npm install --save-dev @next/bundle-analyzer

# Add to next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Run analysis
ANALYZE=true npm run build
```

### 4. WebGL Performance

Already optimized:
- ✅ Client-side only rendering (`ssr: false`)
- ✅ Low-poly geometry
- ✅ Suspense boundaries
- ✅ Efficient animation loops with `useFrame`

### 5. Lighthouse Score Tips

To achieve 90+ Lighthouse scores:

1. **Performance:**
   - Images: Use WebP/AVIF formats
   - Code splitting: Already handled by Next.js
   - Caching: Configure in hosting platform

2. **Accessibility:**
   - Already implemented with semantic HTML
   - ARIA labels in place
   - Motion preferences respected

3. **SEO:**
   - Meta tags: Already added in `_document.tsx` and `index.tsx`
   - Sitemap: Generate with `next-sitemap` package if needed

4. **Best Practices:**
   - HTTPS: Handled by hosting platforms
   - Security headers: Configure in hosting platform

---

## Environment Variables

This static site doesn't require environment variables. If you add API calls later:

1. Create `.env.local`:
```bash
NEXT_PUBLIC_API_URL=https://api.example.com
```

2. Access in code:
```javascript
const apiUrl = process.env.NEXT_PUBLIC_API_URL;
```

3. Configure in hosting platform's dashboard

---

## Custom Domain Setup

### Vercel
1. Go to project settings → Domains
2. Add your domain
3. Configure DNS (A/CNAME records provided)

### GitHub Pages
1. Add CNAME file to `public/` directory
2. Configure DNS to point to GitHub's servers
3. Enable in repository settings

### Cloudflare Pages
1. Go to project settings → Custom domains
2. Add domain (if using Cloudflare DNS, it's automatic)

### Netlify
1. Go to Site settings → Domain management
2. Add custom domain
3. Configure DNS records

---

## Monitoring & Analytics

### Add Analytics (Optional)

**Vercel Analytics:**
```bash
npm install @vercel/analytics
```

```javascript
// pages/_app.tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps, router }: AppProps) {
  return (
    <>
      <AnimatePresence mode="wait">
        {/* existing code */}
      </AnimatePresence>
      <Analytics />
    </>
  );
}
```

**Google Analytics:**
```javascript
// Add to _document.tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
  strategy="afterInteractive"
/>
```

---

## Troubleshooting

### Build Fails

**Issue:** `Module not found: Can't resolve 'three'`
**Solution:** Ensure all dependencies are installed:
```bash
npm install
npm run build
```

**Issue:** `WebGL context lost`
**Solution:** This is a client-side issue, not build-related. The site includes fallback handling.

### Deployment Issues

**Issue:** 404 on routes
**Solution:** Ensure your hosting platform is configured for single-page apps (SPA). Next.js handles this automatically.

**Issue:** Slow initial load
**Solution:** 
- Ensure CDN is enabled
- Check bundle size with bundle analyzer
- Preload critical resources

### 3D Content Not Showing

**Issue:** Black canvas or no 3D content
**Solution:**
- Check browser console for WebGL errors
- Ensure `ssr: false` is set on Hero3D dynamic import
- Test in different browsers (Chrome/Firefox support WebGL)

---

## Rollback Strategy

If deployment fails:

**Vercel:**
```bash
vercel rollback
```

**GitHub Pages:**
```bash
git revert <commit-hash>
git push
```

**Cloudflare/Netlify:**
- Use the dashboard to rollback to previous deployment

---

## Continuous Deployment

### GitHub Actions (Example)

```yaml
# .github/workflows/deploy.yml
name: Deploy Website

on:
  push:
    branches: [main]
    paths:
      - 'website/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd website && npm ci
      - name: Build
        run: cd website && npm run build
      - name: Deploy to Vercel
        run: cd website && npx vercel --prod --token=${{ secrets.VERCEL_TOKEN }}
```

---

## Security Checklist

- [x] No secrets in code
- [x] HTTPS enabled (handled by hosting)
- [x] CSP headers (configure in hosting)
- [x] Dependencies up to date
- [x] No exposed API keys

---

## Support

For issues or questions:
- Check the main [README.md](./README.md)
- Review [Next.js deployment docs](https://nextjs.org/docs/deployment)
- Review [React Three Fiber docs](https://docs.pmnd.rs/react-three-fiber)

---

## Success Metrics

After deployment, verify:
- ✅ Website loads in < 3 seconds
- ✅ 3D content renders correctly
- ✅ Animations are smooth (60fps)
- ✅ Mobile responsive
- ✅ Lighthouse score > 85
- ✅ No console errors

Happy deploying! 🚀
