create extension if not exists pgcrypto;

create table if not exists public.event_settings (
  id boolean primary key default true check (id),
  capacity integer not null check (capacity >= 0),
  updated_at timestamptz not null default timezone('utc', now())
);
insert into public.event_settings (id, capacity)
values (true, 200)
on conflict (id) do nothing;

create table if not exists public.attendees (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(btrim(full_name)) between 3 and 100),
  phone text not null,
  email text not null,
  filiere text not null,
  academic_year text not null,
  invitation_id text not null,
  registered_at timestamptz not null default timezone('utc', now()),
  attendance_status text not null default 'registered'
    check (attendance_status in ('registered', 'present', 'absent'))
);

create unique index if not exists attendees_email_unique on public.attendees (lower(btrim(email)));
create unique index if not exists attendees_phone_unique on public.attendees (btrim(phone));
create unique index if not exists attendees_invitation_unique on public.attendees (invitation_id);
create index if not exists attendees_registered_at_idx on public.attendees (registered_at desc);
create index if not exists attendees_filiere_idx on public.attendees (filiere);
create index if not exists attendees_academic_year_idx on public.attendees (academic_year);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.registration_attempts (
  ip_hash text primary key,
  window_start timestamptz not null,
  attempt_count integer not null
);

alter table public.attendees enable row level security;
alter table public.admins enable row level security;
alter table public.event_settings enable row level security;
alter table public.registration_attempts enable row level security;

-- API role privileges. RLS then provides per-user access.
grant usage on schema public to anon, authenticated, service_role;
grant select on public.admins to authenticated;
grant select, update on public.attendees to authenticated;
grant select on public.event_settings to authenticated;

-- Admins may read their own authorization row. No attendee data is public.
drop policy if exists "Admins can read own admin record" on public.admins;
create policy "Admins can read own admin record"
  on public.admins for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Admins can read attendees" on public.attendees;
create policy "Admins can read attendees"
  on public.attendees for select
  to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()));

drop policy if exists "Admins can update attendees" on public.attendees;
create policy "Admins can update attendees"
  on public.attendees for update
  to authenticated
  using (exists (select 1 from public.admins where user_id = auth.uid()))
  with check (exists (select 1 from public.admins where user_id = auth.uid()));

create or replace function public.register_attendee(
  p_full_name text,
  p_phone text,
  p_email text,
  p_filiere text,
  p_academic_year text,
  p_ip_hash text default null
) returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_capacity integer;
  v_count bigint;
  v_email text;
  v_phone text;
  v_invitation_id text;
  v_attendee record;
  v_attempt_count integer;
  v_window_start timestamptz;
begin
  if p_full_name is null or char_length(btrim(p_full_name)) < 3
    or p_phone is null or p_email is null or p_filiere is null or p_academic_year is null then
    return jsonb_build_object('ok', false, 'code', 'invalid');
  end if;

  v_email := lower(btrim(p_email));
  v_phone := btrim(p_phone);

  if p_ip_hash is not null then
    select window_start, attempt_count
      into v_window_start, v_attempt_count
      from public.registration_attempts
      where ip_hash = p_ip_hash
      for update;

    if found and v_window_start > timezone('utc', now()) - interval '1 hour' then
      if v_attempt_count >= 10 then
        return jsonb_build_object('ok', false, 'code', 'rate_limited');
      end if;
      update public.registration_attempts
        set attempt_count = attempt_count + 1
        where ip_hash = p_ip_hash;
    else
      insert into public.registration_attempts(ip_hash, window_start, attempt_count)
      values (p_ip_hash, timezone('utc', now()), 1)
      on conflict (ip_hash) do update
        set window_start = timezone('utc', now()), attempt_count = 1;
    end if;
  end if;

  -- This singleton row is the database transaction lock for all capacity checks.
  select capacity into v_capacity
  from public.event_settings
  where id = true
  for update;

  select count(*) into v_count
  from public.attendees;

  if v_count >= v_capacity then
    return jsonb_build_object('ok', false, 'code', 'capacity');
  end if;

  if exists (select 1 from public.attendees where lower(btrim(email)) = v_email) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_email');
  end if;

  if exists (select 1 from public.attendees where btrim(phone) = v_phone) then
    return jsonb_build_object('ok', false, 'code', 'duplicate_phone');
  end if;

  v_invitation_id := 'ENSPEC-' || to_char(timezone('utc', now()), 'YYYYMMDD') || '-' ||
                     upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  insert into public.attendees
    (full_name, phone, email, filiere, academic_year, invitation_id)
  values
    (btrim(p_full_name), v_phone, v_email, p_filiere, p_academic_year, v_invitation_id)
  returning * into v_attendee;

  return jsonb_build_object(
    'ok', true,
    'attendee', jsonb_build_object(
      'id', v_attendee.id,
      'full_name', v_attendee.full_name,
      'phone', v_attendee.phone,
      'email', v_attendee.email,
      'filiere', v_attendee.filiere,
      'academic_year', v_attendee.academic_year,
      'invitation_id', v_attendee.invitation_id,
      'registered_at', v_attendee.registered_at
    )
  );
exception
  when unique_violation then
    return jsonb_build_object('ok', false, 'code', 'duplicate');
  when others then
    raise;
end;
$$;

revoke execute on function public.register_attendee(text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.register_attendee(text, text, text, text, text, text) to service_role;
