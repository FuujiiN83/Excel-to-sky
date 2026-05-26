create table public.rate_limits (
  ip            text not null,
  window_start  timestamptz not null,
  count         int not null default 1,
  primary key (ip, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies. Only service_role (Edge Functions) touches this.

create index idx_rate_limits_window on public.rate_limits(window_start);
