-- Courses table (owned by a professor)
create table public.courses (
    id uuid primary key default gen_random_uuid(),
    name text not null,
    code varchar(20) unique not null,
    professor_id uuid not null references public.profiles(id) on delete cascade,
    created_at timestamptz default now()
);

create index idx_courses_professor on public.courses(professor_id);
