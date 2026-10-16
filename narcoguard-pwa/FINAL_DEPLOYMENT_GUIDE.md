# NarcoGuard Final Deployment Guide

## Quick Deploy to narcoguard.app

This is the complete, step-by-step guide to deploy NarcoGuard to production at narcoguard.app.

---

## Prerequisites Checklist

- [ ] GitHub account created
- [ ] Vercel account created (free tier works perfectly)
- [ ] Git installed locally
- [ ] Node.js 20+ installed
- [ ] Domain narcoguard.app purchased (or ready to purchase)

---

## Part 1: GitHub Setup (5 minutes)

### 1. Create GitHub Repository

\`\`\`bash
# Create new repo on GitHub.com named: narcoguard-pwa
# Then run locally:

git init
git add .
git commit -m "feat: initial NarcoGuard NG deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/narcoguard-pwa.git
git push -u origin main
\`\`\`

### 2. Verify Push

Visit: `https://github.com/YOUR_USERNAME/narcoguard-pwa`

You should see all files including:
- ✅ GitHub Actions workflows in `.github/workflows/`
- ✅ All component files
- ✅ Configuration files

---

## Part 2: Vercel Deployment (10 minutes)

### 1. Connect to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click **"Add New..."** → **"Project"**
4. Select your `narcoguard-pwa` repository
5. Click **"Import"**

### 2. Configure Project

**Framework Preset:** Next.js (auto-detected)

**Build & Development Settings:**
- Build Command: `npm run build` (default)
- Output Directory: `.next` (default)
- Install Command: `npm install` (default)

**Environment Variables** (Optional - app works with mock data):
\`\`\`
NEXT_PUBLIC_APP_NAME=NarcoGuard
NEXT_PUBLIC_APP_URL=https://narcoguard.app
\`\`\`

Click **"Deploy"**

### 3. Wait for Deployment

- First build takes 2-3 minutes
- You'll get a temporary URL like: `narcoguard-pwa.vercel.app`
- Test the app at this URL first

---

## Part 3: Custom Domain Setup (15-60 minutes)

### 1. Add Domain in Vercel

1. Go to your project dashboard in Vercel
2. Click **"Settings"** → **"Domains"**
3. Enter: `narcoguard.app`
4. Click **"Add"**

### 2. Configure DNS

Vercel will show DNS instructions. If you're using:

**Option A: Vercel Nameservers (Recommended)**
\`\`\`
ns1.vercel-dns.com
ns2.vercel-dns.com
\`\`\`

**Option B: A Records**
\`\`\`
A Record: @ → 76.76.21.21
CNAME: www → cname.vercel-dns.com
\`\`\`

### 3. Wait for DNS Propagation

- Usually takes 5-30 minutes
- Can take up to 48 hours in rare cases
- Check status at: [dnschecker.org](https://dnschecker.org)

### 4. Verify SSL Certificate

Vercel automatically provisions SSL certificates. Once DNS propagates:
- Visit `https://narcoguard.app`
- Look for 🔒 padlock in browser
- Certificate should be valid

---

## Part 4: GitHub Actions Setup (10 minutes)

### 1. Get Vercel Credentials

From terminal in your project:
\`\`\`bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link project
vercel link

# Get project details
cat .vercel/project.json
\`\`\`

Copy these values:
- `orgId` → This is your VERCEL_ORG_ID
- `projectId` → This is your VERCEL_PROJECT_ID

### 2. Get Vercel Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens)
2. Click **"Create"**
3. Name it: `GitHub Actions Deployment`
4. Scope: Full Account
5. Click **"Create Token"**
6. Copy the token (you'll only see it once!)

### 3. Add GitHub Secrets

1. Go to your GitHub repo
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"**

Add these three secrets:

\`\`\`
Name: VERCEL_TOKEN
Value: [paste your token]

Name: VERCEL_ORG_ID  
Value: [paste your orgId]

Name: VERCEL_PROJECT_ID
Value: [paste your projectId]
\`\`\`

### 4. Verify Workflows

1. Go to **Actions** tab in GitHub
2. You should see workflows running
3. All workflows should pass ✅

---

## Part 5: Verification (10 minutes)

### Production Checklist

Visit `https://narcoguard.app` and verify:

- [ ] Site loads with HTTPS (🔒)
- [ ] No console errors
- [ ] Onboarding flow works
- [ ] PWA install prompt appears (mobile/Chrome)
- [ ] Service worker registers (check DevTools → Application)
- [ ] Offline mode works (DevTools → Network → Offline)
- [ ] Emergency button displays after onboarding
- [ ] Vitals monitoring shows (mock data)
- [ ] Location services request permission
- [ ] Hero map displays
- [ ] AR guidance accessible
- [ ] Guardian AI chat responds

### PWA Verification

**Mobile (Chrome/Edge/Safari):**
1. Visit site on mobile
2. Look for "Install" or "Add to Home Screen"
3. Install the app
4. Open from home screen
5. Should run full-screen like native app

**Desktop (Chrome/Edge):**
1. Visit site
2. Look for install icon in address bar
3. Click to install
4. App opens in standalone window

### Performance Check

Run Lighthouse audit (Chrome DevTools):
\`\`\`
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select: Mobile/Desktop
4. Check all categories
5. Click "Analyze page load"
\`\`\`

Target Scores:
- Performance: 80+
- Accessibility: 90+
- Best Practices: 90+
- SEO: 90+
- PWA: 80+

---

## Part 6: Automation Verification

### Check GitHub Actions

Your app now has automated workflows running:

**CI Workflow** (4x daily + every push)
- Type checking
- Linting
- Build verification
- Security audits

**Deploy Workflow** (on push to main)
- Automatic deployment to narcoguard.app
- Zero-downtime updates

**Optimization Workflow** (3x daily)
- Bundle analysis
- Image optimization
- Dependency cleanup

**Testing Workflow** (2x daily)
- Unit tests
- E2E tests
- Accessibility tests

View running workflows:
`https://github.com/YOUR_USERNAME/narcoguard-pwa/actions`

---

## Part 7: Monitoring & Maintenance

### Vercel Analytics

1. Go to Vercel dashboard → Your project
2. Click **"Analytics"** tab
3. See real-time:
   - Visitor count
   - Page views
   - Performance metrics
   - Core Web Vitals

### GitHub Insights

Monitor repository health:
- **Insights** tab → **Community**
- **Security** tab → Dependabot alerts
- **Actions** tab → Workflow runs

### Automatic Updates

The system automatically:
- ✅ Checks for dependency updates 4x daily
- ✅ Creates PRs for safe updates
- ✅ Runs security scans continuously
- ✅ Optimizes performance 3x daily
- ✅ Generates deployment reports

### Manual Deployment

To manually deploy:
\`\`\`bash
# Make changes
git add .
git commit -m "feat: your changes"
git push origin main

# Automatically deploys to production!
\`\`\`

---

## Troubleshooting

### Build Fails

**Check locally first:**
\`\`\`bash
npm install
npm run build
\`\`\`

**If local build works:**
- Check Vercel logs in dashboard
- Verify environment variables
- Check Node.js version (should be 20+)

### Domain Not Working

**DNS Issues:**
- Wait 30-60 minutes for propagation
- Check at dnschecker.org
- Verify DNS records in registrar

**SSL Issues:**
- Vercel auto-provisions certificates
- May take 5-10 minutes after DNS propagates
- Check Vercel domain settings

### PWA Not Installing

**Check requirements:**
- Must be HTTPS (production only)
- Service worker must register
- Manifest must be valid
- Check browser console for errors

**Test service worker:**
\`\`\`javascript
// In browser console:
navigator.serviceWorker.getRegistrations().then(console.log)
\`\`\`

### GitHub Actions Failing

**Check secrets:**
- VERCEL_TOKEN is valid
- VERCEL_ORG_ID is correct
- VERCEL_PROJECT_ID is correct

**View detailed logs:**
- Go to Actions tab
- Click failed workflow
- Expand failed step
- Check error message

---

## Success Criteria

### You're done when:

- ✅ narcoguard.app loads over HTTPS
- ✅ PWA installs on mobile and desktop
- ✅ All features work with mock data
- ✅ Service worker registers successfully
- ✅ Offline mode works
- ✅ GitHub Actions all pass
- ✅ Lighthouse scores meet targets
- ✅ Automatic deployments work

---

## Next Steps

### Phase 1: Testing (Week 1)
- Share with beta testers
- Gather feedback
- Monitor analytics
- Fix any bugs

### Phase 2: Real Integrations (Week 2-3)
- Connect real database (Supabase/Neon)
- Add SMS notifications (Twilio)
- Integrate NG Watch API
- Add AI assistant (OpenAI)

### Phase 3: Hero Network (Week 4+)
- Recruit and train heroes
- Build hero community
- Test emergency response
- Expand coverage areas

### Phase 4: Scale (Ongoing)
- Optimize performance
- Add new features
- Expand to new regions
- Partner with organizations

---

## Support Resources

- **Code Issues:** GitHub Issues tab
- **Deployment:** Vercel Support (vercel.com/help)
- **Domain:** Your registrar's support
- **Community:** Create Discord/Slack for heroes

---

## Final Notes

**Remember:**
- This is a life-saving application
- Every deployment could help save someone's life
- Test thoroughly before major changes
- Monitor analytics and user feedback
- Iterate based on real-world usage

**The app currently:**
- ✅ Works perfectly with MOCK data
- ✅ Requires NO external API keys to run
- ✅ Fully functional for demonstration
- ✅ Ready for real integrations when you're ready

**When adding real services:**
- Add environment variables in Vercel dashboard
- Test in preview deployments first
- Deploy to production only after testing
- Monitor for errors in first 24 hours

---

## Congratulations!

You've successfully deployed NarcoGuard to production at narcoguard.app!

This is more than an app - it's a movement to save and transform lives.

**Every person who installs this app is a potential life saved.**

---

**Questions? Issues? Improvements?**

Open an issue on GitHub or contact the development team.

**Let's save lives together. 🛡️💙**
\`\`\`
