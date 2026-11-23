-- EVENTS by Raphaël — schéma de départ
-- À exécuter une seule fois dans Supabase > SQL Editor > New query.
-- La sécurité RLS empêche les visiteurs de lire les réponses des autres.

create extension if not exists pgcrypto;

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  slug text not null unique,
  event_date date,
  event_time text default '',
  location_label text default '',
  description text default '',
  theme text not null default 'blue-gold',
  published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 1 and 100),
  status text not null check (status in ('present','absent')),
  party_size integer not null default 1 check (party_size between 0 and 20),
  note text default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.events enable row level security;
alter table public.rsvps enable row level security;

-- Les visiteurs peuvent uniquement voir les événements publiés.
create policy "Public can view published events"
on public.events for select
to anon, authenticated
using (published = true);

-- L'administrateur connecté peut gérer tous les événements.
create policy "Authenticated admins can manage events"
on public.events for all
to authenticated
using (true)
with check (true);

-- Un visiteur peut envoyer une réponse pour un événement publié.
-- Aucune politique SELECT publique n'est créée pour les réponses.
create policy "Public can submit RSVP for published event"
on public.rsvps for insert
to anon, authenticated
with check (
  exists (
    select 1 from public.events
    where events.id = rsvps.event_id
      and events.published = true
  )
);

-- L'administrateur connecté peut consulter, modifier et supprimer les réponses.
create policy "Authenticated admins can read RSVPs"
on public.rsvps for select
to authenticated
using (true);

create policy "Authenticated admins can update RSVPs"
on public.rsvps for update
to authenticated
using (true)
with check (true);

create policy "Authenticated admins can delete RSVPs"
on public.rsvps for delete
to authenticated
using (true);

-- Active la sécurité au niveau des lignes sur les tables.
grant select on public.events to anon, authenticated;
grant insert, update, delete on public.events to authenticated;
grant insert on public.rsvps to anon, authenticated;
grant select, update, delete on public.rsvps to authenticated;
