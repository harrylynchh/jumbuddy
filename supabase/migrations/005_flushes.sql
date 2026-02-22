-- Flushes table: core edit tracking unit
-- Each flush captures a window of editing activity on a single file,
-- storing a unified diff so the file can be reconstructed by replaying
-- the chain of flushes in strict order.
create table public.flushes (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    assignment_id uuid not null references public.assignments(id) on delete cascade,
    file_path text not null,

    -- Client-generated unique ID for deduplication (checked at read time, not on insert)
    client_flush_id uuid not null,

    -- Monotonic sequence number per (profile_id, assignment_id, file_path) chain
    -- Guarantees strict ordering for reconstruction
    sequence_number integer not null,

    -- SHA-256 hash of file content AFTER applying this diff
    -- Used to verify reconstruction correctness
    content_hash char(64) not null,

    trigger varchar(50) not null,
    start_timestamp timestamptz not null,
    end_timestamp timestamptz not null,
    diffs text not null,

    -- Periodic full file snapshot for fast reconstruction and error recovery.
    -- NULL on most flushes; populated every SNAPSHOT_INTERVAL sequences and on init.
    -- Reconstruction: jump to nearest snapshot, replay diffs forward.
    snapshot text,

    active_symbol varchar(255),
    metrics jsonb default '{}',
    created_at timestamptz default now(),

    -- Derived column: window duration in seconds
    window_duration double precision generated always as (
        extract(epoch from end_timestamp - start_timestamp)
    ) stored,

    -- No unique constraints — append-only, dedup at read time via client_flush_id
);

-- Primary query pattern: reconstruct a file by replaying flushes in strict order
-- This composite index supports: WHERE profile_id=X AND assignment_id=Y AND file_path=Z ORDER BY sequence_number
create index idx_flushes_diff_chain
    on public.flushes(profile_id, assignment_id, file_path, sequence_number);

-- Fast dedup lookups at read time
create index idx_flushes_client_flush_id on public.flushes(client_flush_id);

-- Lookup flushes by assignment (e.g. professor viewing all student work)
create index idx_flushes_assignment on public.flushes(assignment_id, start_timestamp);

-- Lookup flushes by profile across all assignments
create index idx_flushes_profile on public.flushes(profile_id, start_timestamp);

-- Time-range queries (analytics dashboards)
create index idx_flushes_time on public.flushes(start_timestamp, end_timestamp);

alter table public.flushes enable row level security;
