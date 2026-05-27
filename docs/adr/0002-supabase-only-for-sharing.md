# 0002 — Supabase is the only server-side component, and only for sharing

- **Status:** Accepted
- **Date:** 2026-05-26

## Context

The product is built around a strong privacy claim: datasets stay in the user's browser. There is, however, one feature that is fundamentally not local — the public-share link. The visitor of `/d/<slug>` is a different person than the owner, often on a different device, possibly without the app installed in any cache. Something has to host the dashboard payload server-side.

We considered four options for that "something":

1. **Full backend.** Roll our own Express/Fastify + Postgres + auth + storage. Maximum control, maximum maintenance.
2. **Firebase.** Mature, but vendor-locked to Google, opaque billing for spikes, US-centric.
3. **Cloudflare Workers + D1/R2.** Edge-fast, cheap, but D1 is still maturing and we did not want SQL-via-fetch for this size.
4. **Supabase.** Postgres + Edge Functions (Deno) + JS SDK, with a generous free tier, an EU region, and the option to self-host the entire stack later.

The same conversation also asked: should we use Supabase for *anything else*? Anonymous user identity? Quotas? Telemetry? Comments on dashboards? The answer turned into a separate constraint: **no.**

## Decision

Supabase (region UE) is the only server-side component of Excel to Sky, and its responsibility is strictly:

1. **Persist a shared dashboard** when the user explicitly clicks "Compartir". Payload includes the typed dataset, a random 12-character slug, and the **hash** of a delete token (the plain token only lives in the user's IndexedDB).
2. **Serve a shared dashboard** when a visitor opens `/d/<slug>`, refreshing `lastViewedAt`.
3. **Delete a shared dashboard** when the owner presents the matching delete token, or automatically when `lastViewedAt + 90 days` is in the past.
4. **Rate-limit** create/delete operations to prevent abuse.

Anything outside that list — anonymous user identity, analytics, telemetry, comments, server-side rendering, etc. — does not go through Supabase (or any other server). If it has to exist, it lives in the browser.

## Consequences

**Pros**

- **The privacy claim survives intact.** Browsing, parsing and analysing a spreadsheet never hit Supabase. Only the explicit Share action does.
- **Single piece of infrastructure to manage.** One project, one set of migrations, one set of edge functions, one billing.
- **EU residency by default.** Supabase exposes a region setting; we picked Frankfurt. No transatlantic transfer for the base feature.
- **No accounts needed.** The delete token + slug pair gives us all the identity we need; no auth tables, no email verification, no password reset flow.
- **Migration path.** Supabase is open source; if we ever outgrow the hosted offering, we can self-host the same stack.

**Cons**

- **Single point of failure for sharing.** If Supabase is down, no one can open `/d/<slug>` links. Local dashboards still work.
- **Vendor coupling for the API surface.** We use Supabase's Edge Function runtime (Deno + their conventions). Porting to plain Postgres would mean rewriting a small amount of code.
- **No durable record of who shared what.** Without accounts, an owner who clears IndexedDB loses their delete token and has to email us to remove the dashboard. We accept this trade.

## Compliance and follow-ups

- All new server-side functionality goes via Supabase, or via a supersession ADR.
- If a use case appears that requires identity (e.g. a paid plan, an admin dashboard for the operator), it can be added *alongside* Supabase, but the **default share flow must remain account-less**.
- Logging in edge functions is allowed but must redact dataset content; only metadata (slug, IP truncated, timing) is acceptable in logs.
