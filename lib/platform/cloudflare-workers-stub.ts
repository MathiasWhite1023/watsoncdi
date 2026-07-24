/**
 * Build-only replacement for the Cloudflare virtual module in the IBM image.
 *
 * The PostgreSQL path is selected before D1 bindings are requested. If an IBM
 * deployment reaches this object, its database configuration is incomplete and
 * the explicit error prevents an unsafe fallback to an unbound data store.
 */
export const env = new Proxy<Record<string, never>>(
  {},
  {
    get() {
      throw new Error(
        "Cloudflare bindings are unavailable in the IBM runtime. Configure DATABASE_URL.",
      );
    },
  },
);
