-- Flushes table: core edit tracking unit
-- Each flush captures a window of editing activity on a single file,
-- storing a unified diff so the file can be reconstructed by replaying
-- the chain of flushes in order.
create table public.flushes (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.profiles(id) on delete cascade,
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    file_path text not null,
    trigger varchar(50) not null,
    start_timestamp timestamptz not null,
    end_timestamp timestamptz not null,
    diffs text not null,
    active_symbol varchar(255),
    metrics jsonb default '{}',
    created_at timestamptz default now(),

    -- Derived column: window duration in seconds
    window_duration double precision generated always as (
        extract(epoch from end_timestamp - start_timestamp)
    ) stored
);

-- Primary query pattern: reconstruct a file by replaying flushes in order
-- This composite index supports: WHERE user_id=X AND assignment_id=Y AND file_path=Z ORDER BY start_timestamp
create index idx_flushes_diff_chain
    on public.flushes(user_id, assignment_id, file_path, start_timestamp);

-- Lookup flushes by assignment (e.g. professor viewing all student work)
create index idx_flushes_assignment on public.flushes(assignment_id, start_timestamp);

-- Lookup flushes by user across all assignments
create index idx_flushes_user on public.flushes(user_id, start_timestamp);

-- Time-range queries (analytics dashboards)
create index idx_flushes_time on public.flushes(start_timestamp, end_timestamp);
