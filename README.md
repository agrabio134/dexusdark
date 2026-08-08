# React + Vite

## Listings administration

Listings are persisted in `data/listings.json` and served by the Node API. On first run, the store is seeded with the markets that were previously hard-coded in the frontend.

1. Copy `.env.example` to `.env` and set the admin credentials and a random session secret.
2. Run `npm install` and `npm run dev`.
3. Open `/auth/admin` to list, delist, relist, or permanently remove token mints.

### Netlify deployment

The committed `netlify.toml` builds the Vite frontend, deploys the API as a Netlify Function, preserves SPA routes such as `/auth/admin`, and stores listings in the site-wide `usdark-listings` Netlify Blobs store so they survive redeploys.

Before deploying, add these variables under **Netlify → Project configuration → Environment variables**:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `SESSION_SECRET` (at least 32 random characters)

Trigger a new deploy after saving them. Do not commit `.env`; it is only for local development.

For a traditional Node host, run `npm run build` followed by `npm start`. Set `NODE_ENV=production` when served through HTTPS and persist `data/listings.json`.

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
