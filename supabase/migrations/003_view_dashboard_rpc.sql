create or replace function public.view_dashboard(p_slug text)
returns table (slug text, name text, data jsonb, created_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.dashboards
     set view_count = view_count + 1,
         last_viewed_at = now(),
         expires_at = now() + interval '90 days'
   where dashboards.slug = p_slug
     and dashboards.expires_at > now();

  return query
    select d.slug, d.name, d.data, d.created_at
      from public.dashboards d
     where d.slug = p_slug
       and d.expires_at > now();
end;
$$;

revoke all on function public.view_dashboard(text) from public;
grant execute on function public.view_dashboard(text) to anon, authenticated;

-- Daily cleanup cron
create extension if not exists pg_cron;
select cron.schedule(
  'cleanup_expired_dashboards',
  '0 3 * * *',
  $$ delete from public.dashboards where expires_at < now(); $$
);
