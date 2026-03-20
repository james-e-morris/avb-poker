# AVB Planning Poker - GitHub Pages Deployment

This app is a static site, so it deploys cleanly to GitHub Pages.

## What is already set up

- GitHub Actions workflow: `.github/workflows/planning-poker-pages.yml`
- Deploy source: repository root static files (`index.html`, `app.js`, `styles.css`)
- Output: GitHub Pages site artifact
- Ably key injection at deploy-time from repo secret `ABLY_API_KEY`

## One-time GitHub setup

1. In GitHub, open your repository settings.
2. Go to **Secrets and variables > Actions**.
3. Add a repository secret named `ABLY_API_KEY`.
   - Value format: `xxxxxx.yyyyyy:zzzzzzzzzzzzzz`
   - If omitted, app still deploys and runs in local demo mode.
4. Go to **Settings > Pages**.
5. Set **Source** to **GitHub Actions**.

## Deploy behavior

- Pushes to `prod`/`main` that touch app files or the workflow trigger deploy.
- You can also run the workflow manually via **Actions > Deploy Planning Poker to GitHub Pages**.

## Security note

Using an Ably API key directly in browser code is acceptable for quick demos but exposes credentials to clients. For production, move to token auth via a small backend auth endpoint.
