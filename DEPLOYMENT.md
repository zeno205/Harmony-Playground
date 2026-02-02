# Deploying to GitHub Pages

This repository is configured to deploy to GitHub Pages using the `gh-pages` package.

Steps to deploy:

1. Install dependencies (already configured):
   ```bash
   npm install
   ```
2. Build and publish (this runs `npm run build` then pushes `dist/` to the `gh-pages` branch):
   ```bash
   npm run deploy
   ```

Notes:

- `vite.config.ts` uses a relative `base` for production builds so the app can be served from a project subpath (GitHub Pages). Locally the dev server still runs at `/` for convenience.
- The `deploy` script uses `gh-pages -d dist` to publish the `dist` directory to the `gh-pages` branch.
- If you'd rather host from the `docs/` folder or a custom branch, adjust the `deploy` script in `package.json` accordingly.

Troubleshooting:

- If your site is served from `https://<username>.github.io/<repo>/`, relative assets will work correctly.
- If you prefer an absolute base (`/my-repo/`), change `base` in `vite.config.ts` to `'/my-repo/'` and rebuild.
