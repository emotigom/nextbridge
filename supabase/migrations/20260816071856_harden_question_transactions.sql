alter table public.event_questions
  add column idempotency_key_hash text
  check (idempotency_key_hash is null or idempotency_key_hash ~ '^[0-9a-f]{64}$');

create unique index event_questions_event_idempotency_idx
  on public.event_questions (event_slug, idempotency_key_hash)
  where idempotency_key_hash is not null;

create or replace function public.create_event_question(
  p_event_slug text,
  p_receipt_code text,
  p_idempotency_key_hash text,
  p_private_token_hash text,
  p_category text,
  p_question_text text,
  p_contact_method text,
  p_contact_value text
)
returns table (
  question_id uuid,
  question_receipt_code text,
  was_created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_question_id uuid;
  v_receipt_code text;
  v_private_token_hash text;
begin
  if not exists (
    select 1
    from public.events e
    where e.slug = p_event_slug
      and e.is_active = true
  ) then
    raise exception using
      errcode = 'P0001',
      message = 'EVENT_NOT_ACTIVE';
  end if;

  select q.id, q.receipt_code, q.private_token_hash
  into v_question_id, v_receipt_code, v_private_token_hash
  from public.event_questions q
  where q.event_slug = p_event_slug
    and q.idempotency_key_hash = p_idempotency_key_hash
  limit 1;

  if found then
    if v_private_token_hash <> p_private_token_hash then
      raise exception using
        errcode = '22023',
        message = 'IDEMPOTENCY_KEY_MISMATCH';
    end if;
    return query select v_question_id, v_receipt_code, false;
    return;
  end if;

  begin
    insert into public.event_questions (
      event_slug,
      receipt_code,
      idempotency_key_hash,
      private_token_hash,
      category,
      question_text,
      contact_method,
      contact_value
    )
    values (
      p_event_slug,
      p_receipt_code,
      p_idempotency_key_hash,
      p_private_token_hash,
      p_category,
      p_question_text,
      p_contact_method,
      p_contact_value
    )
    returning id, receipt_code
    into v_question_id, v_receipt_code;
  exception
    when unique_violation then
      select q.id, q.receipt_code, q.private_token_hash
      into v_question_id, v_receipt_code, v_private_token_hash
      from public.event_questions q
      where q.event_slug = p_event_slug
        and q.idempotency_key_hash = p_idempotency_key_hash
      limit 1;

      if found then
        if v_private_token_hash <> p_private_token_hash then
          raise exception using
            errcode = '22023',
            message = 'IDEMPOTENCY_KEY_MISMATCH';
        end if;
        return query select v_question_id, v_receipt_code, false;
        return;
      end if;

      raise exception using
        errcode = '23505',
        message = 'QUESTION_RECEIPT_COLLISION';
  end;

  insert into public.question_status_events (
    question_id,
    from_status,
    to_status,
    actor_user_id
  )
  values (
    v_question_id,
    null,
    'received',
    null
  );

  return query select v_question_id, v_receipt_code, true;
end;
$$;

revoke all on function public.create_event_question(
  text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.create_event_question(
  text, text, text, text, text, text, text, text
) to service_role;

create or replace function public.update_event_question(
  p_event_slug text,
  p_question_id uuid,
  p_expected_updated_at timestamptz,
  p_status text,
  p_answer_text text,
  p_actor_user_id uuid
)
returns table (
  question_id uuid,
  question_receipt_code text,
  question_status text,
  question_updated_at timestamptz,
  previous_status text,
  participant_contact_method text,
  participant_contact_value text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_question public.event_questions%rowtype;
  v_answer_text text;
  v_now timestamptz := clock_timestamp();
begin
  if not exists (
    select 1
    from public.event_operator_memberships m
    where m.event_slug = p_event_slug
      and m.user_id = p_actor_user_id
      and m.is_active = true
      and m.role in ('owner', 'operator')
  ) then
    raise exception using
      errcode = '42501',
      message = 'OPERATOR_FORBIDDEN';
  end if;

  select q.*
  into v_question
  from public.event_questions q
  where q.id = p_question_id
    and q.event_slug = p_event_slug
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'QUESTION_NOT_FOUND';
  end if;

  if v_question.updated_at is distinct from p_expected_updated_at then
    raise exception using
      errcode = '40001',
      message = 'QUESTION_CONFLICT';
  end if;

  if p_status not in ('received', 'reviewing', 'answered') then
    raise exception using
      errcode = '22023',
      message = 'INVALID_QUESTION_STATUS';
  end if;

  v_answer_text := nullif(btrim(coalesce(p_answer_text, '')), '');
  if p_status = 'answered' and v_answer_text is null then
    raise exception using
      errcode = '22023',
      message = 'ANSWER_REQUIRED';
  end if;

  update public.event_questions q
  set
    status = p_status,
    answer_text = v_answer_text,
    answered_at = case
      when p_status = 'answered' and v_question.status = 'answered'
        then v_question.answered_at
      when p_status = 'answered'
        then v_now
      else null
    end,
    updated_at = v_now
  where q.id = p_question_id
    and q.event_slug = p_event_slug;

  if v_question.status <> p_status then
    insert into public.question_status_events (
      question_id,
      from_status,
      to_status,
      actor_user_id
    )
    values (
      p_question_id,
      v_question.status,
      p_status,
      p_actor_user_id
    );
  end if;

  return query
  select
    p_question_id,
    v_question.receipt_code,
    p_status,
    v_now,
    v_question.status,
    v_question.contact_method,
    v_question.contact_value;
end;
$$;

revoke all on function public.update_event_question(
  text, uuid, timestamptz, text, text, uuid
) from public, anon, authenticated;
grant execute on function public.update_event_question(
  text, uuid, timestamptz, text, text, uuid
) to service_role;

comment on column public.event_questions.idempotency_key_hash is
  'SHA-256 hash of the client idempotency key. Prevents duplicate question rows after retries.';
comment on function public.create_event_question(
  text, text, text, text, text, text, text, text
) is 'Creates a question and its initial status event in one transaction.';
comment on function public.update_event_question(
  text, uuid, timestamptz, text, text, uuid
) is 'Updates a question with optimistic concurrency and records status history atomically.';
