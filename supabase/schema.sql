-- Run in Supabase: SQL Editor > New query.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  role text not null default 'student' check (role in ('student','school')),
  full_name text, student_id text unique, roll_no text, school text
);
create table documents (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles on delete cascade,
  doc_type text not null, file_path text not null, file_name text not null, sha256 text not null,
  status text not null default 'pending' check (status in ('pending','verified','rejected')),
  created_at timestamptz default now()
);
create table shares (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null references profiles on delete cascade,
  code_hash text not null, doc_ids uuid[] not null, expires_at timestamptz not null
);
create table access_log (
  id bigint generated always as identity primary key,
  owner uuid not null references profiles on delete cascade,
  ok boolean not null, at timestamptz default now()
);

-- Every signup is a student. Promote school staff by hand:
--   update profiles set role='school', school='Demo Public School' where id='<user uuid>';
create function handle_new_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into profiles(id, full_name, student_id, roll_no, school) values (
    new.id, new.raw_user_meta_data->>'full_name', upper(new.raw_user_meta_data->>'student_id'),
    upper(new.raw_user_meta_data->>'roll_no'), new.raw_user_meta_data->>'school');
  return new;
end $$;
create trigger on_signup after insert on auth.users for each row execute function handle_new_user();

create function my_role() returns text language sql security definer stable set search_path=public as $$ select role from profiles where id=auth.uid() $$;
create function my_school() returns text language sql security definer stable set search_path=public as $$ select school from profiles where id=auth.uid() $$;
create function school_of(u uuid) returns text language sql security definer stable set search_path=public as $$ select school from profiles where id=u $$;

alter table profiles enable row level security;
alter table documents enable row level security;
alter table shares enable row level security;
alter table access_log enable row level security;

create policy "own profile" on profiles for select using (id=auth.uid());
create policy "read docs" on documents for select using (owner=auth.uid() or (my_role()='school' and school_of(owner)=my_school()));
create policy "add own docs" on documents for insert with check (owner=auth.uid() and status='pending');
create policy "delete own docs" on documents for delete using (owner=auth.uid());
create policy "school reviews" on documents for update using (my_role()='school' and school_of(owner)=my_school());
create policy "own shares" on shares for all using (owner=auth.uid()) with check (owner=auth.uid());
create policy "own log" on access_log for select using (owner=auth.uid());

insert into storage.buckets (id, name, public) values ('documents','documents',false);
create policy "upload to own folder" on storage.objects for insert to authenticated
  with check (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "read own files" on storage.objects for select to authenticated
  using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "delete own files" on storage.objects for delete to authenticated
  using (bucket_id='documents' and (storage.foldername(name))[1]=auth.uid()::text);
