# 🚀 Production Deployment Guide for NarcoGuard

## Deploy to narcoguard.app - Final Steps

### Option 1: Deploy via v0 (Recommended - Fastest)

1. **Click the "Publish" button** in the top right corner of v0
2. Your app will be deployed to Vercel with a preview URL
3. **Configure custom domain:**
   - Go to your Vercel dashboard
   - Select your NarcoGuard project
   - Go to Settings → Domains
   - Add `narcoguard.app` as a custom domain
   - Update your DNS records as instructed by Vercel

### Option 2: Deploy via GitHub + Vercel

1. **Push to GitHub:**
   \`\`\`bash
   git add .
   git commit -m "Production ready deployment"
   git push origin main
   \`\`\`

2. **Connect to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure project settings:
     - Framework Preset: Next.js
     - Root Directory: ./
     - Build Command: `npm run build`
     - Output Directory: `.next`

3. **Add Domain:**
   - In Vercel project settings → Domains
   - Add `narcoguard.app`
   - Follow DNS configuration instructions

### Domain Configuration

**DNS Records for narcoguard.app:**

\`\`\`
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME  
Name: www
Value: cname.vercel-dns.com
\`\`\`

### Environment Variables (Production)

Set these in Vercel Dashboard → Settings → Environment Variables:

\`\`\`env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://narcoguard.app
NEXT_PUBLIC_API_URL=https://narcoguard.app/api

# Optional: Add real API keys for production features
# OPENAI_API_KEY=sk-...
# TWILIO_ACCOUNT_SID=...
# TWILIO_AUTH_TOKEN=...
\`\`\`

### Post-Deployment Checklist

- [ ] Verify PWA installation works
- [ ] Test emergency SOS functionality
- [ ] Confirm location services work
- [ ] Validate offline mode
- [ ] Test on multiple devices (iOS, Android)
- [ ] Verify SSL certificate is active
- [ ] Check all buttons and navigation
- [ ] Test Guardian AI responses
- [ ] Verify vitals monitoring
- [ ] Confirm hero network map loads

### Monitoring Setup

1. **Vercel Analytics** (Included Free):
   - Automatically enabled with deployment
   - View at: Dashboard → Analytics

2. **Error Tracking**:
   - Errors logged to Vercel Functions logs
   - View at: Dashboard → Deployments → Function Logs

3. **Performance**:
   - Lighthouse CI runs automatically via GitHub Actions
   - View reports in Actions tab

### Continuous Deployment

Every push to `main` branch will automatically:
- Run tests and linting
- Build the application
- Deploy to production
- Run security scans
- Update performance metrics

### Support & Maintenance

- **Automated Updates**: GitHub Actions run 3x daily for dependency updates
- **Security Scans**: Every 6 hours via Trivy and CodeQL
- **Performance Monitoring**: Every 8 hours via Lighthouse CI
- **Auto-merge**: Dependabot PRs for patch/minor updates

### URLs After Deployment

- **Production**: https://narcoguard.app
- **API Endpoints**: https://narcoguard.app/api/*
- **GitHub Repo**: https://github.com/YOUR_USERNAME/narcoguard-pwa
- **Vercel Dashboard**: https://vercel.com/dashboard

## 🎉 Your App Is Live!

Once deployed, NarcoGuard will be accessible at **narcoguard.app** and ready to save lives.

**Share the movement:**
- Tweet: "Just launched NarcoGuard - the life-saving PWA with NG auto-injection tech! 🚀 #NarcoGuard #SaveLives"
- Update app stores (when native apps are ready)
- Share with recovery organizations
- Promote Good Samaritan laws in your state
