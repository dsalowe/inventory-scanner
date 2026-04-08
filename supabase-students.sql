-- =============================================
-- Students table — Run this in Supabase SQL Editor
-- =============================================

create table if not exists students (
  id uuid default gen_random_uuid() primary key,
  student_code text unique not null,
  name text not null,
  contact text,
  notes text,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index if not exists students_code_idx on students(student_code);

alter table students enable row level security;

create policy "Authenticated users can read students"
  on students for select using (auth.role() = 'authenticated');

create policy "Authenticated users can insert students"
  on students for insert with check (auth.role() = 'authenticated');

create policy "Authenticated users can update students"
  on students for update using (auth.role() = 'authenticated');
