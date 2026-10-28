# Secrets, Environment and Cloudflare Policy

- Never commit .env, .env.local, .dev.vars, .wrangler outputs, ZIPs with source secrets or service-role keys.
- Frontend Vite public variables use VITE_ prefix ONLY for intended public values. Supabase anon/public publishable key can be public only within properly configured RLS; Supabase service_role / secret key must NEVER be VITE_.
- Backend secrets live in Cloudflare Functions/Workers or Supabase's server-side secrets store; no secrets in frontend bundle or GitHub docs.
- Use .env.example with non-secret placeholders and distinguish Development/Staging/Production.
- Cloudflare Pages target: npm ci && npm run build once package-lock is committed; output dist. Until then, do not mark deployment reproducible/production ready.
- For backend HTTP functions require least-privilege CORS, auth/entitlements, bounded payload and rate limits.
- Security headers CSP/HSTS/frame-ancestors/Permissions-Policy must be tested against actual Zoom SDK/video and safe sources; avoid blindly breaking media/embed flows.
- Keep environment inventory of **names only**, owner/rotation and deployment targets; do not disclose values.
- Validate live SSL, redirects, cookies, allowed origins, sourcemaps, no token leakage and rollback after production launch.
