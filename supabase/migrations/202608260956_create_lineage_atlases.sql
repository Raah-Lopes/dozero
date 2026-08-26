create schema if not exists private;

create or replace function private.can_view_campaign(target_campaign_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.campaigns c
    where c.id = target_campaign_id
      and (
        c.is_public = true
        or c.owner_id = (select auth.uid())
        or exists (
          select 1
          from public.players p
          where p.campaign_id = c.id
            and p.user_id = (select auth.uid())
        )
      )
  );
$$;

revoke all on function private.can_view_campaign(text) from public;
grant usage on schema private to authenticated;
grant execute on function private.can_view_campaign(text) to authenticated;

create table public.lineage_atlases (
  campaign_id text primary key references public.campaigns(id) on delete cascade,
  data jsonb not null default '{"kind":"linhagem","version":1,"persons":[]}'::jsonb,
  schema_version integer not null default 1 check (schema_version > 0),
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lineage_atlases_valid_document check (
    jsonb_typeof(data) = 'object'
    and data ->> 'kind' = 'linhagem'
    and jsonb_typeof(data -> 'persons') = 'array'
  )
);

create index lineage_atlases_updated_by_idx on public.lineage_atlases(updated_by);

alter table public.lineage_atlases enable row level security;

revoke all on table public.lineage_atlases from anon, authenticated;
grant select, insert, update, delete on table public.lineage_atlases to authenticated;

create policy "lineage_atlases_select_campaign_members"
on public.lineage_atlases
for select
to authenticated
using (private.can_view_campaign(campaign_id));

create policy "lineage_atlases_insert_campaign_managers"
on public.lineage_atlases
for insert
to authenticated
with check (
  public.is_campaign_manager(campaign_id)
  and updated_by = (select auth.uid())
);

create policy "lineage_atlases_update_campaign_managers"
on public.lineage_atlases
for update
to authenticated
using (public.is_campaign_manager(campaign_id))
with check (
  public.is_campaign_manager(campaign_id)
  and updated_by = (select auth.uid())
);

create policy "lineage_atlases_delete_campaign_managers"
on public.lineage_atlases
for delete
to authenticated
using (public.is_campaign_manager(campaign_id));
