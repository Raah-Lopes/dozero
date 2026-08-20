-- ==============================================================================
-- DOZERO VTT - SUPABASE DATABASE SCHEMA
-- Tabela de Campanhas / Mesas com Redundância Cloud & Sincronização em Tempo Real
-- ==============================================================================

-- 1. Criação da Tabela de Campanhas
create table if not exists public.campaigns (
  id text primary key,
  name text not null,
  system text default 'D&D 5e / Fantasia',
  description text default '',
  cover_url text default '/assets/vtt_layout_hero.jpg',
  room_code text unique not null,
  pass_code text default '',
  wiki_path text default 'D:/DOZERO/wikidozero',
  is_public boolean default true,
  is_closed boolean default false,
  active_players_count integer default 1,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_played_at timestamptz default now()
);

-- 2. Índices para Alto Desempenho
create index if not exists idx_campaigns_room_code on public.campaigns (room_code);
create index if not exists idx_campaigns_owner_id on public.campaigns (owner_id);
create index if not exists idx_campaigns_updated_at on public.campaigns (updated_at desc);

-- 3. Habilita Row Level Security (RLS)
alter table public.campaigns enable row level security;

-- Política de Leitura: Qualquer usuário (autenticado ou anônimo) pode ver mesas públicas ou suas próprias mesas
create policy "Leitura pública de campanhas"
  on public.campaigns for select
  using (is_public = true or auth.uid() = owner_id or owner_id is null);

-- Política de Criação: Usuários autenticados ou anônimos podem criar mesas
create policy "Criação de campanhas"
  on public.campaigns for insert
  with check (auth.uid() = owner_id or owner_id is null or auth.uid() is not null);

-- Política de Edição: Apenas o dono da mesa ou mesas criadas na sessão podem editar
create policy "Edição de campanhas"
  on public.campaigns for update
  using (auth.uid() = owner_id or owner_id is null);

-- Política de Exclusão: Apenas o dono da mesa ou mesas criadas na sessão podem deletar
create policy "Exclusão de campanhas"
  on public.campaigns for delete
  using (auth.uid() = owner_id or owner_id is null);

-- 4. Habilita Notificações em Tempo Real (Supabase Realtime)
alter publication supabase_realtime add table public.campaigns;
