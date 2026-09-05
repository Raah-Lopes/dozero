-- Mesas públicas abertas devem aparecer no mural e na lista de mesas.
-- Mesas privadas continuam protegidas pela política de vínculo existente.
drop policy if exists campaigns_select_public_open on public.campaigns;

create policy campaigns_select_public_open
  on public.campaigns
  for select
  using (is_public = true and is_closed = false);
