-- Garante acesso administrativo às contas fundadoras mesmo quando elas foram
-- criadas depois das migrations iniciais de controle da plataforma.
begin;

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
