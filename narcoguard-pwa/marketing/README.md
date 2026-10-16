# NarcoGuard Marketing Automation

## Overview
Automated marketing system for NarcoGuard PWA and GoFundMe campaign.

## Campaign Details
- **GoFundMe URL**: https://gofund.me/9acf270ea
- **Live App**: https://narcoguard.app
- **Demo URL**: https://narcoguard-pwa-iota.vercel.app/
- **GitHub Repo**: https://github.com/coden607/narcoguard-pwa

## Goal
Raise funds for transparent prototype development, documented testing, and expert and community review, with a long-term goal of evaluating up to 80 prototype units in Broome County, NY.

## Automated Workflows

### 1. Cross-Platform Campaign Generator (daily)
- Builds platform-specific copy for X, Facebook, Instagram, LinkedIn, Reddit, TikTok, and YouTube Shorts
- Writes publish-ready drafts to `marketing/posts/<date>/`
- Optionally relays payloads to a configured social scheduler only during an explicitly approved manual run
- Runs daily from GitHub Actions

### 2. Content Creation
- Fetches campaign stats and generates graphics metadata
- Reuses the same theme cycle across platforms while adapting tone and length
- Focuses on a high-signal, low-noise cadence instead of blasting every platform equally

## 7-Day Campaign Messages

### Day 1: Public Demo
Focus: Software demonstration and concept materials available
Hashtags: #NarcoGuard #SaveLives #HarmReduction

### Day 2: Hero Network
Focus: Volunteer response system
Hashtags: #HeroNetwork #BroomeCounty

### Day 3: Recovery Resources
Focus: Rat Park inspiration, community support
Hashtags: #RecoverySupport #RatPark

### Day 4: Share Request
Focus: Community engagement
Hashtags: #ShareToSaveLives

### Day 5: Technology Showcase
Focus: Candidate components and validation roadmap
Hashtags: #MedicalTechnology #Innovation

### Day 6: Local Community
Focus: Binghamton/Broome County
Hashtags: #Binghamton #LocalSupport

### Day 7: Weekly Recap
Focus: Gratitude, progress update
Hashtags: #WeekOneDown #Grateful

## Setup Instructions

### Required Secrets (Optional)
Add a relay endpoint or platform credentials if you want automated publishing beyond draft generation:
- `MARKETING_RELAY_URL` (manual workflow runs only)
- `ALLOW_MARKETING_PUBLISH=true` (required for each approved publish run)
- `TWITTER_API_KEY`
- `TWITTER_API_SECRET`
- `TWITTER_ACCESS_TOKEN`
- `TWITTER_ACCESS_SECRET`
- `FACEBOOK_ACCESS_TOKEN`
- `LINKEDIN_ACCESS_TOKEN`

Without API keys or a relay, the workflow will still:
- Generate platform-specific marketing content
- Save posts to `marketing/posts/<date>/`
- Track campaign progress
- Create graphics metadata

### Buffer

`vercel env run -- npm run marketing:buffer` creates private Buffer drafts by default for connected Instagram and LinkedIn channels. For an explicitly approved queue action, run `ALLOW_MARKETING_PUBLISH=true vercel env run -- npm run marketing:buffer`. Add `MARKETING_PUBLISH_NOW=true` to an approved run to publish immediately instead of adding posts to the queue. GitHub workflow schedules remain draft-generation-only because Vercel secrets are not copied into GitHub Actions.

### Short-form videos

Run `npm run marketing:videos` on a system with FFmpeg and the DejaVu Sans Bold font installed. The command regenerates the three vertical MP4 assets in `marketing/videos/`; each video includes a visible concept-status disclaimer.

## Manual Posting
If social media APIs aren't configured, find generated content in:
- `marketing/posts/<date>/` - Platform-specific drafts
- `marketing/graphics/` - Graphics metadata
- `marketing/stats/` - Campaign statistics

## Engagement Tips
1. Match the cadence to the platform instead of cross-posting identical text everywhere.
2. Keep X short and direct.
3. Keep LinkedIn more technical and outcome-focused.
4. Keep Reddit plainspoken and disclosure-first.
5. Keep TikTok and YouTube Shorts hook-driven and visual.
6. Include both the demo and GoFundMe links where the platform allows it.
7. Reuse the same weekly theme with different copy structures per platform.

## Key Messages
- **Help fund responsible development of the NarcoGuard NG concept**
- **The proposed wearable and response flows require engineering, clinical, and regulatory validation**
- **The Hero Network is a proposed community-response concept**
- **Recovery resources transform lives**
- **Broome County's solution to the opioid crisis**

## Target Audience
1. Binghamton/Broome County residents
2. Harm reduction advocates
3. Healthcare professionals
4. Recovery community members
5. Tech enthusiasts
6. Social impact investors

## Success Metrics
- GoFundMe donations
- App demo visits
- Social media engagement
- Share/repost rate
- Community volunteer signups
- Media coverage

## Contact
For questions about the campaign: Stephen Blanford
GitHub: @Coden809
