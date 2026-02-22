-- Assignment keys: one unique API key per profile per assignment
-- Auto-generated during browser handoff, identifies both profile and assignment
create table public.assignment_keys (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    profile_id uuid not null references public.profiles(id) on delete cascade,
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    created_at timestamptz default now(),
    unique(profile_id, assignment_id)
);

create index idx_assignment_keys_key on public.assignment_keys(key);
create index idx_assignment_keys_profile_assignment on public.assignment_keys(profile_id, assignment_id);

alter table public.assignment_keys enable row level security;
