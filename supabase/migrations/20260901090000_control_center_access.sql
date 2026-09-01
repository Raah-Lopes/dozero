-- Central de Controle: tenancy por campanha, convites e papéis de plataforma.
-- Gerado manualmente porque o Supabase CLI não está instalado nesta estação.
begin;

create table if not exists public.platform_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users(id)
);

create table if not exists public.account_controls (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'suspended')),
  note text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

-- Administradores fundadores informados pelo responsável do projeto.
insert into public.platform_roles (user_id, role)
select id, 'admin'
from auth.users
where lower(email) in ('raphaell.lops@gmail.com', 'rmirraine@gmail.com')
on conflict (user_id) do update set role = excluded.role;

insert into public.account_controls (user_id, status)
select id, 'active'
from auth.users
where lower(email) in ('raphaell.lops@gmail.com', 'rmirraine@gmail.com')
on conflict (user_id) do update set status = excluded.status, updated_at = now();

create table if not exists public.campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.campaigns(id) on delete cascade,
  email text not null,
  role text not null default 'player' check (role in ('gm', 'player', 'spectator')),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id),
  revoked_at timestamptz,
  unique (campaign_id, email)
);
create index if not exists campaign_invites_email_open_idx
  on public.campaign_invites (lower(email)) where accepted_at is null and revoked_at is null;

create table if not exists public.campaign_character_assignments (
  campaign_id text not null references public.campaigns(id) on delete cascade,
  character_id text not null references public.characters(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid not null references auth.users(id),
  assigned_at timestamptz not null default now(),
  primary key (campaign_id, character_id),
  unique (campaign_id, player_id, character_id)
);
create index if not exists campaign_character_assignments_player_idx
  on public.campaign_character_assignments (campaign_id, player_id);

create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users(id) on delete set null,
  campaign_id text references public.campaigns(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists admin_audit_log_campaign_created_idx on public.admin_audit_log (campaign_id, created_at desc);
create index if not exists admin_audit_log_actor_created_idx on public.admin_audit_log (actor_id, created_at desc);

create schema if not exists private;
create or replace function private.account_is_active(target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select status = 'active' from public.account_controls where user_id = target_user_id), true);
$$;
create or replace function private.is_platform_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.platform_roles where user_id = auth.uid() and role = 'admin');
$$;
create or replace function private.is_campaign_manager(target_campaign_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_platform_admin()
    or exists (select 1 from public.campaigns where id = target_campaign_id and owner_id = auth.uid())
    or exists (select 1 from public.players where campaign_id = target_campaign_id and user_id = auth.uid() and role = 'gm');
$$;
create or replace function private.can_access_campaign(target_campaign_id text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.account_is_active()
    and (private.is_platform_admin()
      or exists (select 1 from public.campaigns c where c.id = target_campaign_id and c.owner_id = auth.uid())
      or exists (select 1 from public.players p where p.campaign_id = target_campaign_id and p.user_id = auth.uid()));
$$;

alter table public.platform_roles enable row level security;
alter table public.account_controls enable row level security;
alter table public.campaign_invites enable row level security;
alter table public.campaign_character_assignments enable row level security;
alter table public.admin_audit_log enable row level security;

grant select, insert, update, delete on public.platform_roles, public.account_controls, public.campaign_invites, public.campaign_character_assignments to authenticated;
grant select on public.admin_audit_log to authenticated;

create policy "platform_roles_self_or_admin" on public.platform_roles for select to authenticated
  using (user_id = auth.uid() or private.is_platform_admin());
create policy "platform_roles_admin_manage" on public.platform_roles for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "account_controls_self_or_admin" on public.account_controls for select to authenticated
  using (user_id = auth.uid() or private.is_platform_admin());
create policy "account_controls_admin_manage" on public.account_controls for all to authenticated
  using (private.is_platform_admin()) with check (private.is_platform_admin());
create policy "invites_visible_to_manager_or_recipient" on public.campaign_invites for select to authenticated
  using (private.is_campaign_manager(campaign_id) or lower(email) = lower(coalesce(auth.jwt()->>'email', '')));
create policy "invites_created_by_manager" on public.campaign_invites for insert to authenticated
  with check (private.is_campaign_manager(campaign_id) and created_by = auth.uid());
create policy "invites_managed_by_manager" on public.campaign_invites for update to authenticated
  using (private.is_campaign_manager(campaign_id)) with check (private.is_campaign_manager(campaign_id));
create policy "invites_accepted_by_recipient" on public.campaign_invites for update to authenticated
  using (lower(email) = lower(coalesce(auth.jwt()->>'email', '')) and accepted_at is null and revoked_at is null)
  with check (lower(email) = lower(coalesce(auth.jwt()->>'email', '')) and accepted_by = auth.uid() and accepted_at is not null);
create policy "assignments_visible_to_campaign" on public.campaign_character_assignments for select to authenticated
  using (private.can_access_campaign(campaign_id));
create policy "assignments_managed_by_manager" on public.campaign_character_assignments for all to authenticated
  using (private.is_campaign_manager(campaign_id)) with check (private.is_campaign_manager(campaign_id));
create policy "audit_visible_to_authorized_operators" on public.admin_audit_log for select to authenticated
  using (private.is_platform_admin() or (campaign_id is not null and private.is_campaign_manager(campaign_id)));

create or replace function private.write_control_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  campaign text;
  target text;
  row_data jsonb;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  campaign := row_data ->> 'campaign_id';
  target := coalesce(row_data ->> 'user_id', row_data ->> 'id', row_data ->> 'character_id');
  insert into public.admin_audit_log (actor_id, campaign_id, action, target_type, target_id, metadata)
  values (auth.uid(), campaign, lower(tg_op), tg_table_name, target, jsonb_build_object('role', row_data ->> 'role', 'email', row_data ->> 'email'));
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
drop trigger if exists audit_platform_roles on public.platform_roles;
create trigger audit_platform_roles after insert or update or delete on public.platform_roles for each row execute function private.write_control_audit();
drop trigger if exists audit_account_controls on public.account_controls;
create trigger audit_account_controls after insert or update or delete on public.account_controls for each row execute function private.write_control_audit();
drop trigger if exists audit_campaign_invites on public.campaign_invites;
create trigger audit_campaign_invites after insert or update or delete on public.campaign_invites for each row execute function private.write_control_audit();
drop trigger if exists audit_campaign_players on public.players;
create trigger audit_campaign_players after insert or update or delete on public.players for each row execute function private.write_control_audit();
drop trigger if exists audit_character_assignments on public.campaign_character_assignments;
create trigger audit_character_assignments after insert or update or delete on public.campaign_character_assignments for each row execute function private.write_control_audit();

-- Nenhum visitante ou cache público pode listar/abrir mesas.
drop policy if exists "campaigns_select_public" on public.campaigns;
drop policy if exists "campaigns_select_authenticated" on public.campaigns;
create policy "campaigns_select_members_only" on public.campaigns for select to authenticated
  using (private.can_access_campaign(id));
drop policy if exists "players_select_public_campaigns" on public.players;
drop policy if exists "players_select_campaign_members" on public.players;
create policy "players_select_members_only" on public.players for select to authenticated
  using (private.can_access_campaign(campaign_id));
drop policy if exists "players_insert" on public.players;
create policy "players_insert_managers_only" on public.players for insert to authenticated
  with check (private.is_campaign_manager(campaign_id));
drop policy if exists "players_update" on public.players;
create policy "players_update_managers_only" on public.players for update to authenticated
  using (private.is_campaign_manager(campaign_id)) with check (private.is_campaign_manager(campaign_id));
drop policy if exists "players_delete" on public.players;
create policy "players_delete_managers_only" on public.players for delete to authenticated
  using (private.is_campaign_manager(campaign_id));

create or replace function private.materialize_accepted_campaign_invite()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.accepted_at is not null and old.accepted_at is null and new.accepted_by is not null then
    insert into public.players (campaign_id, user_id, role, last_seen_at)
    values (new.campaign_id, new.accepted_by, new.role, now())
    on conflict (campaign_id, user_id) do update set role = excluded.role, last_seen_at = excluded.last_seen_at;
  end if;
  return new;
end;
$$;
drop trigger if exists campaign_invite_accepted on public.campaign_invites;
create trigger campaign_invite_accepted after update of accepted_at on public.campaign_invites
  for each row execute function private.materialize_accepted_campaign_invite();

drop policy if exists "characters_select" on public.characters;
create policy "characters_select_owner_or_assigned" on public.characters for select to authenticated
  using (owner_id = auth.uid() or exists (
    select 1 from public.campaign_character_assignments a
    where a.character_id = characters.id and a.campaign_id = characters.campaign_id
      and (a.player_id = auth.uid() or private.is_campaign_manager(a.campaign_id))
  ));

-- Realtime privado: habilite Realtime Authorization no painel Supabase antes do deploy.
drop policy if exists "dozero_realtime_members_read" on realtime.messages;
drop policy if exists "dozero_realtime_members_write" on realtime.messages;
create policy "dozero_realtime_members_read" on realtime.messages for select to authenticated
  using (realtime.topic() like 'yjs:%' and private.can_access_campaign((select id from public.campaigns where room_code = substring(realtime.topic() from 5) limit 1)));
create policy "dozero_realtime_members_write" on realtime.messages for insert to authenticated
  with check (realtime.topic() like 'yjs:%' and private.can_access_campaign((select id from public.campaigns where room_code = substring(realtime.topic() from 5) limit 1)));

revoke all on function private.account_is_active(uuid) from public, anon, authenticated;
revoke all on function private.is_platform_admin() from public, anon, authenticated;
revoke all on function private.can_access_campaign(text) from public, anon, authenticated;
revoke all on function private.materialize_accepted_campaign_invite() from public, anon, authenticated;
revoke all on function private.write_control_audit() from public, anon, authenticated;
commit;
