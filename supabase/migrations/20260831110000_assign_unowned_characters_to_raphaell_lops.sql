-- Fichas legadas sem proprietário não aparecem no Vault porque o cliente
-- consulta apenas registros cujo owner_id é o usuário autenticado.
-- A migração é deliberadamente conservadora: nunca transfere fichas que já
-- pertençam a outra conta.
do $$
declare
  target_owner_id uuid;
begin
  select id
  into target_owner_id
  from public.profiles
  where username = 'raphaell.lops';

  if target_owner_id is null then
    raise exception 'Profile raphaell.lops was not found';
  end if;

  update public.characters
  set owner_id = target_owner_id,
      updated_at = now()
  where owner_id is null;
end;
$$;
