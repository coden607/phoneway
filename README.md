# Phoneway

Phoneway is a browser-based PWA for scale and sensor-assisted weight measurement, with a target accuracy of ±0.1g.

## What it does

- Works as a installable PWA on mobile and desktop.
- Uses device sensors and calibration helpers to improve measurement stability.
- Includes a Vercel deployment setup and GitHub Actions automation for `main`.

## Production

- Intended live URL: `https://phoneway.vercel.app`

## Local development

Open the project in a static server or your preferred dev environment, then load `index.html`.

## Deployment

- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Vercel config: `vercel.json`

## Important docs

- `QUICKSTART.md`
- `DEPLOYMENT.md`
- `SETUP_GITHUB_SECRETS.md`
- `AGENTS.md`
