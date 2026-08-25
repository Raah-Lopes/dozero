begin;

create or replace function public.is_campaign_manager(target_campaign_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.campaigns
    where id = target_campaign_id and owner_id = auth.uid()
  ) or exists (
    select 1 from public.players
    where campaign_id = target_campaign_id and user_id = auth.uid() and role = 'gm'
  );
$$;

drop policy if exists "campaigns_update" on public.campaigns;
create policy "campaigns_update" on public.campaigns for update using (
  auth.uid() = owner_id or public.is_campaign_manager(id)
);

drop policy if exists "players_select" on public.players;
create policy "players_select" on public.players for select using (
  public.is_campaign_manager(campaign_id)
  or user_id = auth.uid()
  or exists (select 1 from public.campaigns where id = campaign_id and is_public = true)
);

drop policy if exists "players_insert" on public.players;
create policy "players_insert" on public.players for insert with check (
  auth.uid() = user_id
  and (role in ('player', 'spectator') or public.is_campaign_manager(campaign_id))
);

drop policy if exists "players_update" on public.players;
create policy "players_update" on public.players for update
  using (user_id = auth.uid() or public.is_campaign_manager(campaign_id))
  with check (
    (auth.uid() = user_id and (role in ('player', 'spectator') or public.is_campaign_manager(campaign_id)))
    or public.is_campaign_manager(campaign_id)
  );

drop policy if exists "players_delete" on public.players;
create policy "players_delete" on public.players for delete using (
  user_id = auth.uid() or public.is_campaign_manager(campaign_id)
);

drop policy if exists "characters_select" on public.characters;
create policy "characters_select" on public.characters for select using (
  auth.uid() = owner_id
  or campaign_id in (select campaign_id from public.players where user_id = auth.uid())
);

drop policy if exists "characters_insert" on public.characters;
create policy "characters_insert" on public.characters for insert with check (auth.uid() = owner_id);

commit;
