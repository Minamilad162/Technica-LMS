-- TECHNICA CONSULT LMS — FUTURE SUPABASE SCHEMA (NOT USED BY THE DEMO)
-- This is a proposed starting migration; review/adjust before production deployment.
-- Explicit grants are intentional for the post-2026-10-30 Supabase Data API policy.
-- Run only in a NEW, dedicated LMS Supabase project after security review.
-- IMPORTANT: Quiz answers and grading should be served/validated via an Edge Function,
-- not handed to learners with a direct SELECT from lms_questions.

create extension if not exists pgcrypto;

create table if not exists public.lms_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'learner' check (role in ('learner','instructor','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.lms_courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  domain text not null,
  summary text not null default '',
  cover_path text,
  is_published boolean not null default false,
  created_by uuid references public.lms_profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lms_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  title text not null,
  display_order integer not null default 0
);

create table if not exists public.lms_lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.lms_modules(id) on delete cascade,
  title text not null,
  lesson_type text not null check (lesson_type in ('reading','pdf','quiz','video')),
  duration_minutes integer not null default 5 check (duration_minutes between 0 and 10000),
  description text not null default '',
  content_path text,
  display_order integer not null default 0
);

create table if not exists public.lms_topics (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  name text not null,
  display_order integer not null default 0,
  unique(course_id,name)
);

create table if not exists public.lms_questions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  topic_id uuid references public.lms_topics(id) on delete set null,
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_index smallint not null check (correct_index between 0 and 5),
  explanation text not null default '',
  reference_text text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.lms_enrollments (
  learner_id uuid not null references public.lms_profiles(id) on delete cascade,
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  progress_percent smallint not null default 0 check (progress_percent between 0 and 100),
  enrolled_at timestamptz not null default now(),
  primary key(learner_id,course_id)
);

create table if not exists public.lms_attempts (
  id uuid primary key default gen_random_uuid(),
  learner_id uuid not null references public.lms_profiles(id) on delete cascade,
  course_id uuid not null references public.lms_courses(id) on delete cascade,
  attempt_type text not null check (attempt_type in ('practice','assessment')),
  started_at timestamptz not null default now(),
  expires_at timestamptz,
  submitted_at timestamptz,
  question_count integer not null check (question_count between 1 and 500),
  score_percent numeric(5,2) check (score_percent between 0 and 100)
);

create table if not exists public.lms_attempt_answers (
  attempt_id uuid not null references public.lms_attempts(id) on delete cascade,
  question_id uuid not null references public.lms_questions(id),
  selected_index smallint check (selected_index between 0 and 5),
  is_flagged boolean not null default false,
  answered_at timestamptz,
  primary key(attempt_id,question_id)
);

create table if not exists public.lms_bookmarks (
  learner_id uuid not null references public.lms_profiles(id) on delete cascade,
  question_id uuid not null references public.lms_questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(learner_id,question_id)
);

create index if not exists lms_modules_course_idx on public.lms_modules(course_id,display_order);
create index if not exists lms_lessons_module_idx on public.lms_lessons(module_id,display_order);
create index if not exists lms_topics_course_idx on public.lms_topics(course_id);
create index if not exists lms_questions_course_idx on public.lms_questions(course_id,topic_id);
create index if not exists lms_attempts_learner_idx on public.lms_attempts(learner_id,started_at desc);
create index if not exists lms_attempts_course_idx on public.lms_attempts(course_id);

-- Definer reads only the caller's role. Learners cannot set their own role:
-- lms_profiles UPDATE is permitted exclusively to admins via RLS.
create or replace function public.lms_is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists(
  select 1 from public.lms_profiles where id = (select auth.uid()) and role = 'admin'
) $$;
revoke all on function public.lms_is_admin() from public,anon,authenticated;
grant execute on function public.lms_is_admin() to authenticated,service_role;

-- Prevent accidental Data API access by anon and grant only required table actions.
-- RLS additionally restricts every authenticated query.
do $$ declare t text; begin
  foreach t in array array[
    'lms_profiles','lms_courses','lms_modules','lms_lessons','lms_topics',
    'lms_questions','lms_enrollments','lms_attempts','lms_attempt_answers','lms_bookmarks'
  ] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('revoke all on public.%I from anon,authenticated',t);
    execute format('grant select,insert,update,delete on public.%I to service_role',t);
  end loop;
end $$;

grant select on public.lms_profiles to authenticated;
grant select,insert,update,delete on public.lms_courses to authenticated;
grant select,insert,update,delete on public.lms_modules to authenticated;
grant select,insert,update,delete on public.lms_lessons to authenticated;
grant select,insert,update,delete on public.lms_topics to authenticated;
grant select,insert,update,delete on public.lms_questions to authenticated;
grant select,insert,update,delete on public.lms_enrollments to authenticated;
grant select on public.lms_attempts,public.lms_attempt_answers to authenticated;
grant select,insert,delete on public.lms_bookmarks to authenticated;
-- Do not grant direct learner writes to attempts/grades: use validated Edge Functions.

-- PROFILE
create policy "profiles_read_own_or_admin" on public.lms_profiles
  for select to authenticated using (id = (select auth.uid()) or public.lms_is_admin());
create policy "profiles_admin_insert" on public.lms_profiles
  for insert to authenticated with check (public.lms_is_admin());
create policy "profiles_admin_update" on public.lms_profiles
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "profiles_admin_delete" on public.lms_profiles
  for delete to authenticated using (public.lms_is_admin());

-- COURSES
create policy "courses_read_published_or_admin" on public.lms_courses
  for select to authenticated using (is_published or public.lms_is_admin());
create policy "courses_admin_insert" on public.lms_courses
  for insert to authenticated with check (public.lms_is_admin());
create policy "courses_admin_update" on public.lms_courses
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "courses_admin_delete" on public.lms_courses
  for delete to authenticated using (public.lms_is_admin());

-- MODULES, LESSONS, TOPICS (published course visible to learner)
create policy "modules_read_published_or_admin" on public.lms_modules
  for select to authenticated using (
    public.lms_is_admin() or exists(select 1 from public.lms_courses c where c.id=course_id and c.is_published)
  );
create policy "modules_admin_insert" on public.lms_modules
  for insert to authenticated with check (public.lms_is_admin());
create policy "modules_admin_update" on public.lms_modules
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "modules_admin_delete" on public.lms_modules
  for delete to authenticated using (public.lms_is_admin());

create policy "lessons_read_published_or_admin" on public.lms_lessons
  for select to authenticated using (
    public.lms_is_admin() or exists(
      select 1 from public.lms_modules m join public.lms_courses c on c.id=m.course_id
      where m.id=module_id and c.is_published
    )
  );
create policy "lessons_admin_insert" on public.lms_lessons
  for insert to authenticated with check (public.lms_is_admin());
create policy "lessons_admin_update" on public.lms_lessons
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "lessons_admin_delete" on public.lms_lessons
  for delete to authenticated using (public.lms_is_admin());

create policy "topics_read_published_or_admin" on public.lms_topics
  for select to authenticated using (
    public.lms_is_admin() or exists(select 1 from public.lms_courses c where c.id=course_id and c.is_published)
  );
create policy "topics_admin_insert" on public.lms_topics
  for insert to authenticated with check (public.lms_is_admin());
create policy "topics_admin_update" on public.lms_topics
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "topics_admin_delete" on public.lms_topics
  for delete to authenticated using (public.lms_is_admin());

-- ANSWER KEY SECURITY: learner receives sanitized questions from a server action.
create policy "questions_admin_read" on public.lms_questions
  for select to authenticated using (public.lms_is_admin());
create policy "questions_admin_insert" on public.lms_questions
  for insert to authenticated with check (public.lms_is_admin());
create policy "questions_admin_update" on public.lms_questions
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "questions_admin_delete" on public.lms_questions
  for delete to authenticated using (public.lms_is_admin());

create policy "enrollments_read_own_or_admin" on public.lms_enrollments
  for select to authenticated using (learner_id = (select auth.uid()) or public.lms_is_admin());
create policy "enrollments_admin_insert" on public.lms_enrollments
  for insert to authenticated with check (public.lms_is_admin());
create policy "enrollments_admin_update" on public.lms_enrollments
  for update to authenticated using (public.lms_is_admin()) with check (public.lms_is_admin());
create policy "enrollments_admin_delete" on public.lms_enrollments
  for delete to authenticated using (public.lms_is_admin());

create policy "attempts_read_own_or_admin" on public.lms_attempts
  for select to authenticated using (learner_id = (select auth.uid()) or public.lms_is_admin());
create policy "answers_read_own_or_admin" on public.lms_attempt_answers
  for select to authenticated using (
    public.lms_is_admin() or exists(
      select 1 from public.lms_attempts a where a.id=attempt_id and a.learner_id=(select auth.uid())
    )
  );

create policy "bookmarks_own_select" on public.lms_bookmarks
  for select to authenticated using (learner_id = (select auth.uid()) or public.lms_is_admin());
create policy "bookmarks_own_insert" on public.lms_bookmarks
  for insert to authenticated with check (learner_id = (select auth.uid()));
create policy "bookmarks_own_delete" on public.lms_bookmarks
  for delete to authenticated using (learner_id = (select auth.uid()));

-- Separate follow-up migrations should add:
-- (1) secure session/question delivery + server-side marking Edge Functions,
-- (2) active enrollment & role checks, (3) signed file Storage policies,
-- (4) notification and course versioning tables, (5) tests verifying every RLS rule.
