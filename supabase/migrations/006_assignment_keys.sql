-- Assignment keys: one key per assignment, shared with all students
-- Students enter this key in the VS Code extension to authenticate
create table public.assignment_keys (
    id uuid primary key default gen_random_uuid(),
    key text not null unique,
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    created_at timestamptz default now(),
    unique(assignment_id)  -- one key per assignment
);

create index idx_assignment_keys_key on public.assignment_keys(key);
create index idx_assignment_keys_assignment on public.assignment_keys(assignment_id);
