begin;

drop policy if exists "scenes_select" on public.scenes;
create policy "scenes_select" on public.scenes for select using (
  auth.uid() = owner_id
  or campaign_id in (select campaign_id from public.players where user_id = auth.uid())
  or exists (select 1 from public.campaigns where id = campaign_id and is_public = true)
);

drop policy if exists "scenes_insert" on public.scenes;
create policy "scenes_insert" on public.scenes for insert with check (
  auth.uid() = owner_id and (campaign_id is null or public.is_campaign_manager(campaign_id))
);

drop policy if exists "scenes_update" on public.scenes;
create policy "scenes_update" on public.scenes for update
  using (auth.uid() = owner_id or public.is_campaign_manager(campaign_id))
  with check (auth.uid() = owner_id or public.is_campaign_manager(campaign_id));

drop policy if exists "scenes_delete" on public.scenes;
create policy "scenes_delete" on public.scenes for delete using (
  auth.uid() = owner_id or public.is_campaign_manager(campaign_id)
);

commit;
