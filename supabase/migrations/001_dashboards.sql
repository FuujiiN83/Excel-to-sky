create table public.dashboards (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null,
  name            text not null,
  data            jsonb not null,
  delete_token    text not null,
  created_at      timestamptz not null default now(),
  last_viewed_at  timestamptz not null default now(),
  view_count      int not null default 0,
  expires_at      timestamptz not null default now() + interval '90 days'
);

create index idx_dashboards_slug on public.dashboards(slug);
create index idx_dashboards_expires_at on public.dashboards(expires_at);

alter table public.dashboards enable row level security;
-- No policies: deny all by default to anon/authenticated roles.
-- Writes go through Edge Functions (service_role); reads via SECURITY DEFINER RPC.
