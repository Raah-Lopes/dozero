-- Restores the least privilege needed by RLS policies that protect the VTT.
-- The private schema stays outside the Data API; only authenticated sessions can
-- execute these helpers while Postgres evaluates the relevant policies.
begin;

grant usage on schema private to authenticated;

revoke all on function private.account_is_active(uuid) from public, anon;
revoke all on function private.is_platform_admin() from public, anon;
revoke all on function private.is_campaign_manager(text) from public, anon;
revoke all on function private.can_access_campaign(text) from public, anon;

grant execute on function private.account_is_active(uuid) to authenticated;
grant execute on function private.is_platform_admin() to authenticated;
grant execute on function private.is_campaign_manager(text) to authenticated;
grant execute on function private.can_access_campaign(text) to authenticated;

-- Founders are idempotently restored as active platform administrators. The
-- client still has no privileged credential: promotion of other accounts is
-- governed by the existing admin-only RLS policies on platform_roles.
insert into public.platform_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) in ('raphaell.lops@gmail.com', 'rmirraine@gmail.com')
on conflict (user_id) do update set role = excluded.role;

insert into public.account_controls (user_id, status, updated_at)
select id, 'active', now()
from auth.users
where lower(email) in ('raphaell.lops@gmail.com', 'rmirraine@gmail.com')
on conflict (user_id) do update
  set status = excluded.status,
      updated_at = excluded.updated_at;

commit;
