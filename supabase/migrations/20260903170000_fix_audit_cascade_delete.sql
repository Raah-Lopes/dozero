-- Fix: write_control_audit falhava ao deletar campanhas porque tentava inserir
-- em admin_audit_log com campaign_id apontando para a campanha sendo deletada.
-- Solucao: se a campanha nao existir mais na transacao, inserir NULL (ja aceito
-- pela FK "on delete set null"). Isso preserva o log sem violar a constraint.

create or replace function private.write_control_audit()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  campaign text;
  target   text;
  row_data jsonb;
  campaign_exists boolean;
begin
  row_data := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  campaign := row_data ->> 'campaign_id';
  target   := coalesce(row_data ->> 'user_id', row_data ->> 'id', row_data ->> 'character_id');

  -- Se ha campaign_id, verifica se ainda existe (pode estar sendo deletada agora).
  -- Se nao existir, registra NULL para nao violar a FK.
  if campaign is not null then
    select exists(select 1 from public.campaigns where id = campaign)
      into campaign_exists;
    if not campaign_exists then
      campaign := null;
    end if;
  end if;

  insert into public.admin_audit_log (actor_id, campaign_id, action, target_type, target_id, metadata)
  values (auth.uid(), campaign, lower(tg_op), tg_table_name, target,
          jsonb_build_object('role', row_data ->> 'role', 'email', row_data ->> 'email'));

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
