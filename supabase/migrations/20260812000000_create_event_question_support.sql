-- Nextbridge event question support foundation.
-- Public browsers never read or write these tables directly. Edge Functions are the API boundary.

create extension if not exists pgcrypto with schema extensions;

create table public.events (
  slug text primary key
    check (slug ~ '^[a-z0-9-]{3,80}$'),
  title text not null
    check (char_length(title) between 1 and 200),
  receipt_prefix text not null
    check (receipt_prefix ~ '^[A-Z0-9]{2,8}$'),
  is_active boolean not null default false,
  starts_on date not null,
  ends_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table public.event_operator_memberships (
  event_slug text not null references public.events(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null
    check (role in ('owner', 'operator', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (event_slug, user_id)
);

create table public.event_questions (
  id uuid primary key default extensions.gen_random_uuid(),
  event_slug text not null references public.events(slug) on delete restrict,
  receipt_code text not null unique
    check (receipt_code ~ '^[A-Z0-9]{2,8}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$'),
  private_token_hash text not null unique
    check (private_token_hash ~ '^[0-9a-f]{64}$'),
  category text not null
    check (
      category in (
        'schedule',
        'signature',
        'room',
        'lodging_meal',
        'transport_parking',
        'submission',
        'other'
      )
    ),
  question_text text not null
    check (char_length(question_text) between 10 and 1000),
  contact_method text not null default 'none'
    check (contact_method in ('none', 'email', 'phone', 'kakao')),
  contact_value text
    check (contact_value is null or char_length(contact_value) between 1 and 160),
  status text not null default 'received'
    check (status in ('received', 'reviewing', 'answered')),
  answer_text text
    check (answer_text is null or char_length(answer_text) between 1 and 2000),
  assigned_operator_id uuid references auth.users(id) on delete set null,
  answered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (contact_method = 'none' and contact_value is null)
    or (contact_method <> 'none' and contact_value is not null)
  ),
  check (
    (status = 'answered' and answer_text is not null and answered_at is not null)
    or status <> 'answered'
  )
);

create table public.question_status_events (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.event_questions(id) on delete cascade,
  from_status text
    check (from_status is null or from_status in ('received', 'reviewing', 'answered')),
  to_status text not null
    check (to_status in ('received', 'reviewing', 'answered')),
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.question_notification_deliveries (
  id bigint generated always as identity primary key,
  question_id uuid not null references public.event_questions(id) on delete cascade,
  kind text not null
    check (kind in ('operator_new_question', 'participant_answered')),
  channel text not null
    check (channel in ('none', 'kakao_alimtalk', 'email', 'slack', 'discord')),
  delivery_status text not null
    check (delivery_status in ('skipped', 'sent', 'failed')),
  error_code text
    check (error_code is null or char_length(error_code) <= 80),
  created_at timestamptz not null default now()
);

create table public.question_rate_limits (
  key_hash text not null
    check (key_hash ~ '^[0-9a-f]{64}$'),
  scope text not null
    check (scope in ('submit', 'status')),
  window_started_at timestamptz not null,
  request_count integer not null
    check (request_count > 0),
  updated_at timestamptz not null default now(),
  primary key (key_hash, scope)
);

create index event_questions_event_status_created_idx
  on public.event_questions (event_slug, status, created_at desc);

create index event_questions_event_created_idx
  on public.event_questions (event_slug, created_at desc);

create index question_status_events_question_created_idx
  on public.question_status_events (question_id, created_at desc);

create index question_notification_question_created_idx
  on public.question_notification_deliveries (question_id, created_at desc);

create index question_rate_limits_updated_idx
  on public.question_rate_limits (updated_at);

create index event_operator_memberships_user_idx
  on public.event_operator_memberships (user_id);

create index event_questions_assigned_operator_idx
  on public.event_questions (assigned_operator_id)
  where assigned_operator_id is not null;

create index question_status_events_actor_idx
  on public.question_status_events (actor_user_id)
  where actor_user_id is not null;

alter table public.events enable row level security;
alter table public.events force row level security;
alter table public.event_operator_memberships enable row level security;
alter table public.event_operator_memberships force row level security;
alter table public.event_questions enable row level security;
alter table public.event_questions force row level security;
alter table public.question_status_events enable row level security;
alter table public.question_status_events force row level security;
alter table public.question_notification_deliveries enable row level security;
alter table public.question_notification_deliveries force row level security;
alter table public.question_rate_limits enable row level security;
alter table public.question_rate_limits force row level security;

revoke all on table public.events from public, anon, authenticated;
revoke all on table public.event_operator_memberships from public, anon, authenticated;
revoke all on table public.event_questions from public, anon, authenticated;
revoke all on table public.question_status_events from public, anon, authenticated;
revoke all on table public.question_notification_deliveries from public, anon, authenticated;
revoke all on table public.question_rate_limits from public, anon, authenticated;
revoke all on sequence public.question_status_events_id_seq from public, anon, authenticated;
revoke all on sequence public.question_notification_deliveries_id_seq from public, anon, authenticated;

grant select, insert, update, delete on table public.events to service_role;
grant select, insert, update, delete on table public.event_operator_memberships to service_role;
grant select, insert, update, delete on table public.event_questions to service_role;
grant select, insert, update, delete on table public.question_status_events to service_role;
grant select, insert, update, delete on table public.question_notification_deliveries to service_role;
grant select, insert, update, delete on table public.question_rate_limits to service_role;
grant usage, select on sequence public.question_status_events_id_seq to service_role;
grant usage, select on sequence public.question_notification_deliveries_id_seq to service_role;

create or replace function public.consume_question_rate_limit(
  p_key_hash text,
  p_scope text,
  p_window_seconds integer,
  p_request_limit integer
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_allowed boolean;
begin
  if p_key_hash !~ '^[0-9a-f]{64}$'
    or p_scope not in ('submit', 'status')
    or p_window_seconds not between 10 and 86400
    or p_request_limit not between 1 and 1000 then
    return false;
  end if;

  insert into public.question_rate_limits (
    key_hash,
    scope,
    window_started_at,
    request_count,
    updated_at
  )
  values (
    p_key_hash,
    p_scope,
    v_now,
    1,
    v_now
  )
  on conflict (key_hash, scope) do update
  set
    window_started_at = case
      when public.question_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now
      then v_now
      else public.question_rate_limits.window_started_at
    end,
    request_count = case
      when public.question_rate_limits.window_started_at
        + make_interval(secs => p_window_seconds) <= v_now
      then 1
      else public.question_rate_limits.request_count + 1
    end,
    updated_at = v_now
  where
    public.question_rate_limits.window_started_at
      + make_interval(secs => p_window_seconds) <= v_now
    or public.question_rate_limits.request_count < p_request_limit
  returning true into v_allowed;

  return coalesce(v_allowed, false);
end;
$$;

revoke all on function public.consume_question_rate_limit(text, text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.consume_question_rate_limit(text, text, integer, integer)
  to service_role;

insert into public.events (
  slug,
  title,
  receipt_prefix,
  is_active,
  starts_on,
  ends_on
)
values (
  '2026-sk',
  '경기 성취평가 표준화 평가도구 개발 합숙 워크숍',
  'SK26',
  false,
  date '2026-08-28',
  date '2026-08-30'
)
on conflict (slug) do update
set
  title = excluded.title,
  receipt_prefix = excluded.receipt_prefix,
  starts_on = excluded.starts_on,
  ends_on = excluded.ends_on,
  updated_at = now();

comment on table public.event_questions is
  'Sensitive participant questions. Access only through audited Edge Functions.';
comment on column public.event_questions.private_token_hash is
  'SHA-256 hash only. The raw private lookup token is never stored.';
comment on column public.event_questions.contact_value is
  'Optional minimal contact detail; never included in public status responses or Realtime.';
