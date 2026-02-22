-- Profiles table (extends auth.users)
-- No role column — membership is determined by students/assistants fact tables
create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    email text not null,
    utln varchar(20) not null unique,
    display_name text,
    created_at timestamptz default now()
);

create index idx_profiles_utln on public.profiles(utln);
