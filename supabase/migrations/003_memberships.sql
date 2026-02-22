-- Students fact table: profile ↔ course membership
create table public.students (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,
    enrolled_at timestamptz default now(),
    unique(profile_id, course_id)
);

create index idx_students_profile on public.students(profile_id);
create index idx_students_course on public.students(course_id);

-- Assistants fact table: profile ↔ course TA membership
create table public.assistants (
    id uuid primary key default gen_random_uuid(),
    profile_id uuid not null references public.profiles(id) on delete cascade,
    course_id uuid not null references public.courses(id) on delete cascade,
    assigned_at timestamptz default now(),
    unique(profile_id, course_id)
);

create index idx_assistants_profile on public.assistants(profile_id);
create index idx_assistants_course on public.assistants(course_id);
