# Softa-Docs
The website and documentations of Softa

## Cloudflare Pages deployment

This site is statically exported (`next.config.mjs` uses `output: 'export'`) and should be deployed from the `out/` directory.

### Edge locale redirect (recommended)

Cloudflare Pages **Functions** are used to redirect unprefixed paths to a canonical locale path:

- `/<path>` → `/<locale>/<path>/`
- Supported locales: `en-US`, `zh-CN`
- Preference order: cookie `SOFTA_LOCALE` / `NEXT_LOCALE` → `Accept-Language` → fallback `en-US`

Implementation: `functions/[[path]].ts`

Notes:
- Local `pnpm dev` does not run Pages Functions; the client-side redirect script remains as a fallback.
