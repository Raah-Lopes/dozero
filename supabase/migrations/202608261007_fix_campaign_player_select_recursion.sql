drop policy if exists "campaigns_select" on public.campaigns;
drop policy if exists "campaigns_select_public" on public.campaigns;
drop policy if exists "campaigns_select_authenticated" on public.campaigns;

create policy "campaigns_select_public"
on public.campaigns
for select
to anon
using (is_public = true or owner_id is null);

create policy "campaigns_select_authenticated"
on public.campaigns
for select
to authenticated
using (owner_id is null or private.can_view_campaign(id));

drop policy if exists "players_select" on public.players;
drop policy if exists "players_select_public_campaigns" on public.players;
drop policy if exists "players_select_campaign_members" on public.players;

create policy "players_select_public_campaigns"
on public.players
for select
to anon
using (
  exists (
    select 1
    from public.campaigns c
    where c.id = campaign_id
      and (c.is_public = true or c.owner_id is null)
  )
);

create policy "players_select_campaign_members"
on public.players
for select
to authenticated
using (private.can_view_campaign(campaign_id));

revoke execute on function public.is_campaign_manager(text) from public, anon;
grant execute on function public.is_campaign_manager(text) to authenticated;
