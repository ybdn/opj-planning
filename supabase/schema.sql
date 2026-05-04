-- Schéma Supabase pour opj-planning.
-- À exécuter une fois dans le SQL Editor du projet Supabase.
--
-- Modèle ultra-simple : une seule ligne (par workspace) contenant tout l'état
-- en JSON. Convient pour un usage perso mono-utilisateur, à ne pas réutiliser
-- pour des données partagées entre comptes.

create table if not exists public.app_state (
  id text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

-- RLS : on autorise tout pour la clé anonyme (pas d'auth dans cette V1).
-- ⚠ Quiconque a l'URL + anon key peut lire/écrire. OK pour usage perso isolé,
-- ne pas utiliser pour des données sensibles.
alter table public.app_state enable row level security;

drop policy if exists "anon all" on public.app_state;
create policy "anon all" on public.app_state
  for all
  to anon
  using (true)
  with check (true);

-- Active la publication realtime pour cette table afin que les autres
-- appareils reçoivent les updates instantanément.
alter publication supabase_realtime add table public.app_state;
