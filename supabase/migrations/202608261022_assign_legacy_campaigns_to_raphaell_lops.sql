do $$
declare
  target_owner_id uuid;
  target_campaign_count integer;
begin
  select id
  into target_owner_id
  from public.profiles
  where username = 'raphaell.lops';

  if target_owner_id is null then
    raise exception 'Profile raphaell.lops was not found';
  end if;

  select count(*)
  into target_campaign_count
  from public.campaigns
  where room_code in ('mesa-1', 'mesa-2');

  if target_campaign_count <> 2 then
    raise exception 'Expected both legacy campaigns mesa-1 and mesa-2, found %', target_campaign_count;
  end if;

  if exists (
    select 1
    from public.campaigns
    where room_code in ('mesa-1', 'mesa-2')
      and owner_id is not null
      and owner_id <> target_owner_id
  ) then
    raise exception 'A legacy campaign already belongs to another profile';
  end if;

  update public.campaigns
  set owner_id = target_owner_id,
      updated_at = now()
  where room_code in ('mesa-1', 'mesa-2')
    and owner_id is null;
end;
$$;
