-- Assignment keys: one unique API key per user per assignment
-- Auto-generated during browser handoff, identifies both user and assignment
create table public.assignment_keys (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    user_id uuid not null references public.profiles(id) on delete cascade,
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    created_at timestamptz default now(),
    unique(user_id, assignment_id)
);

create index idx_assignment_keys_key on public.assignment_keys(key);
create index idx_assignment_keys_user_assignment on public.assignment_keys(user_id, assignment_id);
