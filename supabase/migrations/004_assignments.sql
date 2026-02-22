-- Assignments table: belongs to a course
create table public.assignments (
    id uuid primary key default gen_random_uuid(),
    course_id uuid not null references public.courses(id) on delete cascade,
    name text not null,
    description text,
    due_date timestamptz,
    metadata jsonb default '{}',
    created_at timestamptz default now()
);

create index idx_assignments_course on public.assignments(course_id);
