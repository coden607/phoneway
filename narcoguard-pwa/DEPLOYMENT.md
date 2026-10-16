# 🚀 NarcoGuard Deployment Guide

## Recommended Production URL

### **narcoguard.app** ⭐ PRIMARY RECOMMENDATION

**Why this URL?**
- Short, memorable, and professional
- `.app` TLD requires HTTPS (secure by default)
- Perfect for PWA installation
- Easy to communicate verbally
- Professional brand presence

**Alternative URLs:**
- **narcoguard.life** - Emphasizes mission
- **savewithnarcoguard.com** - Action-oriented

---

## Deployment Steps

### Option 1: One-Click Deploy from v0 (EASIEST)

1. Click **"Publish"** button in v0 interface (top right)
2. Your app deploys to Vercel automatically
3. You get a URL like: `narcoguard-pwa.vercel.app`
4. Add custom domain in next step

### Option 2: Deploy from GitHub

1. Ensure code is pushed to GitHub (already connected in v0)
2. Visit [vercel.com](https://vercel.com)
3. Click "New Project"
4. Import your `narcoguard-pwa` repository
5. Vercel auto-detects Next.js configuration
6. Click "Deploy"

---

## Custom Domain Setup

### Purchase Domain

**Recommended Registrars:**
- **Namecheap** - narcoguard.app ($14.98/year)
- **Google Domains** - Easy DNS management
- **Cloudflare** - Best pricing + built-in CDN

### Connect to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Domains**
3. Enter your domain: `narcoguard.app`
4. Follow DNS configuration instructions:

#### For Namecheap:
\`\`\`
Type: A Record
Host: @
Value: 76.76.21.21

Type: CNAME
Host: www
Value: cname.vercel-dns.com
\`\`\`

5. Wait 24-48 hours for DNS propagation
6. Vercel automatically provisions SSL certificate

---

## PWA Configuration

### Already Configured ✅

Your app includes:
- `manifest.json` with app metadata
- Service worker (`/sw.js`) for offline support
- Install prompts in onboarding flow
- Mobile-optimized design

### Testing PWA Installation

**Mobile (iOS):**
1. Visit `narcoguard.app` in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

**Mobile (Android):**
1. Visit `narcoguard.app` in Chrome
2. Tap menu (three dots)
3. Tap "Install app" or "Add to Home Screen"

**Desktop:**
1. Visit `narcoguard.app` in Chrome/Edge
2. Look for install icon in address bar
3. Click to install

---

## Production Checklist

### Before Launch:
- [ ] Deploy to Vercel
- [ ] Configure custom domain
- [ ] Test PWA installation on iOS and Android
- [ ] Verify onboarding flow (all 12 steps)
- [ ] Test emergency SOS button
- [ ] Verify location services work
- [ ] Test Guardian AI interactions
- [ ] Check all animations and effects
- [ ] Verify HIPAA compliance messaging
- [ ] Test offline functionality

### After Launch:
- [ ] Monitor Vercel Analytics
- [ ] Collect user feedback
- [ ] Monitor error logs
- [ ] Test on multiple devices
- [ ] Share with initial users
- [ ] Begin hero recruitment
- [ ] Start advocacy campaigns

---

## Environment Variables (Future)

When you add integrations later:

\`\`\`bash
# Supabase (for user data)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_key

# Stripe (for NG watch purchases)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxx
STRIPE_SECRET_KEY=sk_live_xxx

# Twilio (for SMS notifications)
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
\`\`\`

Add these in Vercel:
1. Project Settings → Environment Variables
2. Add variable name and value
3. Select "Production" environment
4. Save and redeploy

---

## Performance Optimization

Already implemented:
- ✅ Image optimization with Next.js
- ✅ Code splitting with dynamic imports
- ✅ PWA caching strategy
- ✅ Tailwind CSS purging
- ✅ Font optimization (Orbitron, Inter)

---

## Monitoring & Analytics

### Included:
- Vercel Analytics (automatically enabled)
- Console logging for debugging
- Error boundary handling

### Recommended Additions:
- **Sentry** - Error tracking
- **LogRocket** - Session replay
- **Google Analytics** - User behavior

---

## Support & Maintenance

### Regular Updates:
- Next.js framework updates
- Security patches
- New features based on user feedback
- NG watch firmware compatibility

### User Support:
- Guardian AI provides in-app support
- Emergency hotline information
- Recovery resource links
- Hero network community

---

## Marketing URLs

Consider creating these redirects:

- `narcoguard.app` → Main app
- `ng.watch` → Product landing page
- `joinnarcoguard.org` → Hero recruitment
- `narcoguardny.org` → NY-specific advocacy

---

## Legal Considerations

### Before Public Launch:
- [ ] Review terms of service
- [ ] Verify HIPAA compliance
- [ ] Confirm Good Samaritan law accuracy
- [ ] Get legal review of liability disclaimers
- [ ] Set up privacy policy hosting
- [ ] Consider liability insurance

---

## Success Metrics

Track these KPIs:
- PWA installation rate
- Daily active users
- Emergency SOS activations
- Hero response times
- Recovery resource engagement
- Onboarding completion rate

---

## Scaling Plan

As your user base grows:

1. **Phase 1** (0-1K users): Vercel free tier sufficient
2. **Phase 2** (1K-10K users): Upgrade Vercel Pro ($20/mo)
3. **Phase 3** (10K+ users): Consider dedicated database
4. **Phase 4**: NG watch production and distribution

---

**Deploy with confidence. Save lives with technology.**

Questions? Check the main README.md or reach out to Stephen Blanford.
