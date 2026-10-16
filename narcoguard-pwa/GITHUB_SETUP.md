# GitHub & Deployment Setup Guide

This guide will help you set up automated deployment, CI/CD pipelines, and GitHub Actions for NarcoGuard.

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Repository access

## Step 1: Create GitHub Repository

1. Go to [GitHub](https://github.com) and create a new repository named `narcoguard-pwa`
2. Make it public or private based on your preference
3. Initialize with README (optional, we already have one)

## Step 2: Push Code to GitHub

\`\`\`bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - NarcoGuard PWA with NG Auto-Injection"

# Add remote (replace with your repo URL)
git remote add origin https://github.com/YOUR_USERNAME/narcoguard-pwa.git

# Push to main branch
git push -u origin main
\`\`\`

## Step 3: Set Up Vercel Deployment

### Option A: Automatic (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click "Add New Project"
4. Import your `narcoguard-pwa` repository
5. Configure project settings:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
6. Add environment variables (see below)
7. Deploy!

### Option B: Using Vercel CLI

\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel --prod
\`\`\`

## Step 4: Configure Custom Domain (narcoguard.app)

1. In Vercel dashboard, go to your project
2. Click "Settings" → "Domains"
3. Add `narcoguard.app`
4. Follow DNS configuration instructions:
   - Add A record: `76.76.21.21`
   - Add CNAME record: `cname.vercel-dns.com`
5. Wait for DNS propagation (5-60 minutes)
6. Enable HTTPS (automatic)

## Step 5: Set Up GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

### Required Secrets

\`\`\`
VERCEL_TOKEN
  - Get from: vercel.com/account/tokens
  - Description: Vercel API token for deployments

VERCEL_ORG_ID
  - Get from: .vercel/project.json after first deployment
  - Description: Your Vercel organization ID

VERCEL_PROJECT_ID
  - Get from: .vercel/project.json after first deployment
  - Description: Your Vercel project ID
\`\`\`

### Optional Secrets (for enhanced features)

\`\`\`
SNYK_TOKEN
  - Get from: snyk.io
  - Description: For security vulnerability scanning
\`\`\`

## Step 6: Configure Environment Variables in Vercel

Go to Vercel Dashboard → Your Project → Settings → Environment Variables

Add these for production:

\`\`\`bash
# App Configuration
NEXT_PUBLIC_APP_NAME=NarcoGuard
NEXT_PUBLIC_APP_URL=https://narcoguard.app
NEXT_PUBLIC_API_URL=https://narcoguard.app/api

# Feature Flags
NEXT_PUBLIC_ENABLE_LOCATION_TRACKING=true
NEXT_PUBLIC_ENABLE_VITALS_MONITORING=true
NEXT_PUBLIC_ENABLE_EMERGENCY_ALERTS=true
NEXT_PUBLIC_ENABLE_HERO_NETWORK=true
NEXT_PUBLIC_ENABLE_AR_GUIDANCE=true

# Environment
NODE_ENV=production
\`\`\`

**Note**: The app works perfectly with MOCK data. Add real API keys only when you have actual services to integrate.

## Step 7: Enable GitHub Actions

The workflows are already in `.github/workflows/`. They will automatically run when you push to main.

### Workflows Included

1. **ci.yml** - Runs on every push/PR
   - Type checking
   - Linting
   - Building
   - Security audits
   - Runs 4x daily automatically

2. **deploy.yml** - Runs on push to main
   - Deploys to Vercel production
   - Updates narcoguard.app

3. **optimize.yml** - Runs 3x daily
   - Bundle analysis
   - Image optimization
   - Dependency checks
   - Performance optimization

4. **test.yml** - Runs 2x daily
   - Unit tests
   - E2E tests
   - Integration tests

## Step 8: Verify Deployment

After setup, verify everything works:

1. Visit https://narcoguard.app
2. Check PWA installability (install button should appear)
3. Test offline functionality
4. Verify all features work with mock data
5. Check GitHub Actions tab for successful workflows

## Monitoring & Maintenance

### Automatic Updates

- Dependencies are checked and updated 4x daily
- Security scans run continuously
- Performance optimizations run 3x daily
- All updates create PRs for review

### Manual Deployment

To manually deploy:

\`\`\`bash
# From main branch
git push origin main

# Or trigger workflow manually
# Go to: GitHub → Actions → Deploy to Production → Run workflow
\`\`\`

## Troubleshooting

### Build Failures

\`\`\`bash
# Check build locally first
npm run build

# If it works locally, check Vercel logs
vercel logs [deployment-url]
\`\`\`

### Domain Not Working

- Verify DNS settings (can take up to 48 hours)
- Check Vercel domain configuration
- Ensure SSL certificate is active

### GitHub Actions Failing

- Check secrets are configured correctly
- Review action logs in GitHub Actions tab
- Ensure VERCEL_TOKEN has correct permissions

## Production Checklist

- [ ] Code pushed to GitHub main branch
- [ ] Vercel project created and connected
- [ ] Custom domain (narcoguard.app) configured
- [ ] GitHub secrets added
- [ ] Environment variables set in Vercel
- [ ] First deployment successful
- [ ] PWA manifest working
- [ ] Service worker registered
- [ ] All features tested with mock data
- [ ] GitHub Actions running successfully

## Next Steps

1. **Add Real Integrations** (when ready):
   - Connect database (Supabase/Neon)
   - Add SMS service (Twilio)
   - Integrate NG Watch API
   - Add AI services (OpenAI)

2. **Monitor Performance**:
   - Check Vercel Analytics
   - Review Lighthouse scores
   - Monitor Core Web Vitals

3. **Gather Feedback**:
   - Test with real users
   - Iterate based on feedback
   - Expand hero network

## Support

- **Documentation**: See README.md
- **Issues**: GitHub Issues tab
- **Vercel Support**: vercel.com/help
- **Community**: Create Discord/Slack for heroes and users

---

**Remember**: This is a life-saving app. Every deployment could help save someone's life. Test thoroughly and deploy with confidence! 🛡️
\`\`\`

\`\`\`json file="" isHidden
