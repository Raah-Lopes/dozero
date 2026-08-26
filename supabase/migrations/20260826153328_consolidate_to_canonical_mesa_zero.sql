do $$
declare
  canonical_owner uuid;
begin
  select owner_id
    into canonical_owner
  from public.campaigns
  where owner_id is not null
  order by updated_at desc nulls last
  limit 1;

  if canonical_owner is null then
    select id
      into canonical_owner
    from public.profiles
    where username = 'raphaell.lops'
    limit 1;
  end if;

  if canonical_owner is null then
    raise exception 'Cannot create Mesa 0 without a known owner';
  end if;

  insert into public.campaigns (
    id,
    name,
    system,
    description,
    cover_url,
    room_code,
    is_public,
    is_closed,
    active_players_count,
    owner_id,
    updated_at,
    last_played_at
  ) values (
    'dozero-mesa-principal-v2',
    'Mesa 0 — Ecossistema DOZERO',
    'Sistema agnóstico',
    'Mesa canônica usada para desenvolver e validar o ecossistema DOZERO.',
    '/assets/vtt_layout_hero.jpg',
    'dozero-mesa-principal-v2',
    false,
    false,
    1,
    canonical_owner,
    now(),
    now()
  )
  on conflict (id) do update set
    name = excluded.name,
    system = excluded.system,
    description = excluded.description,
    cover_url = excluded.cover_url,
    room_code = excluded.room_code,
    is_public = excluded.is_public,
    is_closed = excluded.is_closed,
    owner_id = excluded.owner_id,
    updated_at = now();

  insert into public.players (campaign_id, user_id, role, last_seen_at)
  values ('dozero-mesa-principal-v2', canonical_owner, 'gm', now())
  on conflict (campaign_id, user_id) do update set
    role = 'gm',
    last_seen_at = excluded.last_seen_at;

  delete from public.campaigns
  where id <> 'dozero-mesa-principal-v2';

  if (select count(*) from public.campaigns) <> 1 then
    raise exception 'Campaign cleanup did not leave exactly one campaign';
  end if;
end
$$;
