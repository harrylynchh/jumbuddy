-- Enrollments: student enrollments in courses (profile ↔ course)
create table public.enrollments (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,
    enrolled_at timestamptz default now(),
    unique(profile_id, course_id)
);

create index idx_enrollments_profile on public.enrollments(profile_id);
create index idx_enrollments_course on public.enrollments(course_id);

-- Teaching assistants: TA assignments to courses (profile ↔ course)
create table public.teaching_assistants (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,
    assigned_at timestamptz default now(),
    unique(profile_id, course_id)
);

create index idx_teaching_assistants_profile on public.teaching_assistants(profile_id);
create index idx_teaching_assistants_course on public.teaching_assistants(course_id);

alter table public.enrollments enable row level security;
alter table public.teaching_assistants enable row level security;
