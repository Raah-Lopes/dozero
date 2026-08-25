-- ==============================================================================
-- DOZERO VTT - SUPABASE DATABASE SCHEMA DE PRODUÇÃO
-- ==============================================================================

-- 1. Extensões Essenciais
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ==============================================================================
-- 2. PERFIS DE USUÁRIO (Extensão de auth.users)
-- ==============================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  is_gm boolean default false,
  preferences jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger para criar perfil automaticamente no SignUp
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update set
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url),
    full_name = coalesce(excluded.full_name, profiles.full_name);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- 3. CAMPANHAS (Metadados da Mesa & Snapshot de Sessão)
-- ==============================================================================
create table if not exists public.campaigns (
  id text primary key default gen_random_uuid()::text,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  system text default 'D&D 5e / Fantasia',
  description text default '',
  cover_url text default '/assets/vtt_layout_hero.jpg',
  room_code text unique not null,
  pass_code text default '',
  is_public boolean default true,
  is_closed boolean default false,
  active_players_count integer default 1,
  snapshot jsonb, -- Estado consolidado da mesa para carregamento de sessão
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_played_at timestamptz default now()
);

-- ==============================================================================
-- 4. JOGADORES POR CAMPANHA (Controle de Acesso e Membros)
-- ==============================================================================
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  campaign_id text references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  role text not null default 'player' check (role in ('gm', 'player', 'spectator')),
  character_name text,
  joined_at timestamptz default now(),
  last_seen_at timestamptz default now(),
  unique(campaign_id, user_id)
);

-- ==============================================================================
-- 5. PERSONAGENS (Vault Global ou Vinculados a Campanhas)
-- ==============================================================================
create table if not exists public.characters (
  id text primary key default gen_random_uuid()::text,
  campaign_id text references public.campaigns(id) on delete cascade, -- null = Vault Global do Jogador
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  type text default 'pc' check (type in ('pc', 'npc', 'monster')),
  avatar_url text default '',
  data jsonb not null default '{}'::jsonb, -- Atributos, vitais, pericias, macros
  notes_markdown text default '',           -- Grimorio, historia e anotacoes livres
  is_public_to_party boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ==============================================================================
-- 6. ÍNDICES DE ALTO DESEMPENHO
-- ==============================================================================
create index if not exists idx_campaigns_room_code on public.campaigns (room_code);
create index if not exists idx_campaigns_owner_id on public.campaigns (owner_id);
create index if not exists idx_campaigns_updated_at on public.campaigns (updated_at desc);
create index if not exists idx_campaigns_lobby on public.campaigns (updated_at desc) where is_public = true and is_closed = false;

create index if not exists idx_players_campaign_id on public.players (campaign_id);
create index if not exists idx_players_user_id on public.players (user_id);

create index if not exists idx_characters_campaign_id on public.characters (campaign_id);
create index if not exists idx_characters_owner_id on public.characters (owner_id);
create index if not exists idx_characters_data_gin on public.characters using gin (data);

-- ==============================================================================
-- 7. ROW LEVEL SECURITY (RLS) - SEGURANÇA GRANULAR
-- ==============================================================================
alter table public.profiles enable row level security;
alter table public.campaigns enable row level security;
alter table public.players enable row level security;
alter table public.characters enable row level security;

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

-- --- Políticas de Profiles ---
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- --- Políticas de Campaigns ---
create policy "campaigns_select" on public.campaigns 
  for select using (
    is_public = true 
    or auth.uid() = owner_id 
    or owner_id is null
    or id in (select campaign_id from public.players where user_id = auth.uid())
  );

create policy "campaigns_insert" on public.campaigns for insert with check (
  auth.uid() is not null and (owner_id is null or auth.uid() = owner_id)
);

create policy "campaigns_update" on public.campaigns 
  for update using (
    auth.uid() = owner_id 
    or public.is_campaign_manager(id)
  );

create policy "campaigns_delete" on public.campaigns for delete using (
  auth.uid() = owner_id
);

-- --- Políticas de Players ---
create policy "players_select" on public.players 
  for select using (
    public.is_campaign_manager(campaign_id)
    or user_id = auth.uid()
    or exists (select 1 from public.campaigns where id = campaign_id and is_public = true)
  );

create policy "players_insert" on public.players for insert with check (
  auth.uid() = user_id
  and (role in ('player', 'spectator') or public.is_campaign_manager(campaign_id))
);

create policy "players_update" on public.players 
  for update using (user_id = auth.uid() or public.is_campaign_manager(campaign_id))
  with check (
    auth.uid() = user_id
    and (role in ('player', 'spectator') or public.is_campaign_manager(campaign_id))
    or public.is_campaign_manager(campaign_id)
  );

create policy "players_delete" on public.players 
  for delete using (user_id = auth.uid() or public.is_campaign_manager(campaign_id));

-- --- Políticas de Characters ---
create policy "characters_select" on public.characters 
  for select using (
    auth.uid() = owner_id 
    or campaign_id in (select campaign_id from public.players where user_id = auth.uid())
  );

create policy "characters_insert" on public.characters for insert with check (
  auth.uid() = owner_id
);

create policy "characters_update" on public.characters for update using (
  auth.uid() = owner_id
);

create policy "characters_delete" on public.characters for delete using (
  auth.uid() = owner_id
);

-- ==============================================================================
-- 8. TABELAS DE CHAT & LOGS DE COMBATE
-- ==============================================================================
create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  campaign_id text references public.campaigns(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  character_id text references public.characters(id) on delete set null,
  sender_name text default 'Jogador',
  content text not null,
  message_type text default 'chat' check (message_type in ('chat', 'roll', 'system', 'whisper')),
  recipient_id uuid references public.profiles(id),
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

create table if not exists public.combat_encounters (
  id uuid primary key default gen_random_uuid(),
  campaign_id text references public.campaigns(id) on delete cascade,
  name text default 'Encontro de Combate',
  round_count integer default 1,
  outcome text default 'active' check (outcome in ('active', 'victory', 'defeat', 'draw', 'escaped')),
  combatants jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  ended_at timestamptz
);

create index if not exists idx_chat_messages_campaign on public.chat_messages (campaign_id, created_at desc);
create index if not exists idx_combat_encounters_campaign on public.combat_encounters (campaign_id, created_at desc);

alter table public.chat_messages enable row level security;
alter table public.combat_encounters enable row level security;

create policy "chat_messages_select" on public.chat_messages for select using (
  exists (
    select 1 from public.campaigns 
    where campaigns.id = chat_messages.campaign_id 
      and (
        campaigns.is_public = true 
        or campaigns.owner_id = auth.uid() 
        or exists (
          select 1 from public.players 
          where players.campaign_id = campaigns.id and players.user_id = auth.uid()
        )
      )
  )
);

create policy "chat_messages_insert" on public.chat_messages for insert with check (
  auth.uid() is not null
);

create policy "combat_encounters_select" on public.combat_encounters for select using (
  exists (
    select 1 from public.campaigns 
    where campaigns.id = combat_encounters.campaign_id 
      and (
        campaigns.is_public = true 
        or campaigns.owner_id = auth.uid() 
        or exists (
          select 1 from public.players 
          where players.campaign_id = campaigns.id and players.user_id = auth.uid()
        )
      )
  )
);

create policy "combat_encounters_all" on public.combat_encounters for all using (
  exists (
    select 1 from public.campaigns 
    where campaigns.id = combat_encounters.campaign_id 
      and (
        campaigns.owner_id = auth.uid() 
        or exists (
          select 1 from public.players 
          where players.campaign_id = campaigns.id and players.user_id = auth.uid() and players.role = 'gm'
        )
      )
  )
);

-- ==============================================================================
-- 9. CENÁRIOS & BIBLIOTECA DE MAPAS (Scenes)
-- ==============================================================================
create table if not exists public.scenes (
  id uuid primary key default gen_random_uuid(),
  campaign_id text,
  owner_id uuid references public.profiles(id) on delete set null,
  name text not null,
  thumbnail_url text,
  backgrounds jsonb default '[]'::jsonb,
  grid_config jsonb default '{}'::jsonb,
  fog_config jsonb default '{}'::jsonb,
  audio_config jsonb default '{}'::jsonb,
  fog_ops jsonb default '[]'::jsonb,
  drawings jsonb default '[]'::jsonb,
  props jsonb default '[]'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.scenes enable row level security;

create policy "scenes_select" on public.scenes for select using (
  auth.uid() = owner_id
  or campaign_id in (select campaign_id from public.players where user_id = auth.uid())
  or exists (select 1 from public.campaigns where id = campaign_id and is_public = true)
);
create policy "scenes_insert" on public.scenes for insert with check (
  auth.uid() = owner_id and (campaign_id is null or public.is_campaign_manager(campaign_id))
);
create policy "scenes_update" on public.scenes for update
  using (auth.uid() = owner_id or public.is_campaign_manager(campaign_id))
  with check (auth.uid() = owner_id or public.is_campaign_manager(campaign_id));
create policy "scenes_delete" on public.scenes for delete using (
  auth.uid() = owner_id or public.is_campaign_manager(campaign_id)
);

-- ==============================================================================
-- 10. PUBLICAÇÃO REALTIME (Supabase Realtime)
-- ==============================================================================
alter publication supabase_realtime add table public.campaigns;
alter publication supabase_realtime add table public.players;
alter publication supabase_realtime add table public.characters;
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.combat_encounters;
alter publication supabase_realtime add table public.scenes;
