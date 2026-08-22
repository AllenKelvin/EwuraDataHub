# EwuraDataHub Frontend

React + Vite + TypeScript frontend for EwuraDataHub.

## Setup

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Environment Variables

Create a `.env.local` file:

```
VITE_BACKEND_URL=https://ewura-hub-api.onrender.com
```

## Deployment

Deploy the `AllenDataHub-Frontend` directory as a Vite project on Vercel:

1. Import the GitHub repository containing the frontend.
2. Set the **Framework Preset** to `Vite`.
3. Set **Root Directory** to the repository root.
4. Use `npm run build` for the **Build Command**.
5. Use `dist` for the **Output Directory**.
6. Add this production environment variable in Vercel:

```
VITE_BACKEND_URL=https://ewura-hub-api.onrender.com
```

Add `http://localhost:5173` as a Preview environment value when testing locally. Add the custom domains `ewuradatahub.com` and `www.ewuradatahub.com` under Vercel **Domains**. The backend must allow those origins through its `CORS_ORIGIN` setting.
