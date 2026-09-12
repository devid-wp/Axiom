# AXIOM

AXIOM is a web-first architecture learning and Studio workspace.

## Current architecture

- **Primary implementation:** `web/` — Vite, React, TypeScript, and Zustand.
- **Studio source of truth:** `web/src/store/studio.ts` with browser persistence in `localStorage`.
- **AI integration:** `web/src/ai/`; generated lessons are validated before persistence.
- **Native Rust/Slint:** `src/` and `ui/` are frozen and must not be extended without an explicit architecture decision.

## Development

```sh
npm install
npm run dev
```

Open `http://localhost:5173`.

## Verification

```sh
npx tsc --noEmit
npm run build
npx playwright test -c .verify/pw.config.ts
npx esbuild scripts/ai-course-validation.test.ts --bundle --platform=node --outfile=/tmp/axiom-ai-course-validation.cjs
node /tmp/axiom-ai-course-validation.cjs
```

Do not commit `.env`; it may contain API credentials. Browser test output under `test-results/` is temporary.
