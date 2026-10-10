create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_admin = true
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  price numeric(10, 2) check (price is null or price >= 0),
  duration text not null default '',
  description text not null default '',
  features text[] not null default '{}',
  image_url text,
  image_alt text not null default '',
  popular boolean not null default false,
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  price numeric(10, 2) check (price is null or price >= 0),
  subtitle text not null default '',
  image_url text,
  image_alt text not null default '',
  sort_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.slides (
  id uuid primary key default gen_random_uuid(),
  eyebrow text not null,
  headline text not null,
  description text not null default '',
  price_text text,
  service_id uuid references public.services(id) on delete set null,
  action text not null default 'book' check (action in ('book', 'wigs', 'services')),
  button_label text not null,
  image_url text,
  image_position text not null default 'center',
  sort_order integer not null default 0,
  active boolean not null default true
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null check (char_length(phone) between 5 and 24),
  service_id uuid references public.services(id) on delete set null,
  service_name text not null,
  appointment_date date not null,
  preferred_time text not null,
  notes text not null default '' check (char_length(notes) <= 500),
  status text not null default 'new' check (status in ('new', 'confirmed', 'completed', 'cancelled')),
  created_at timestamptz not null default now()
);

create or replace function public.set_booking_service_name()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.appointment_date < current_date then
    raise exception 'Please choose a future appointment date.';
  end if;

  select name into new.service_name
  from public.services
  where id = new.service_id and active = true;

  if new.service_name is null then
    raise exception 'Please choose an available service.';
  end if;

  new.status := 'new';
  return new;
end;
$$;

drop trigger if exists set_booking_service_name on public.bookings;
create trigger set_booking_service_name
before insert on public.bookings
for each row execute function public.set_booking_service_name();

alter table public.profiles enable row level security;
alter table public.services enable row level security;
alter table public.products enable row level security;
alter table public.slides enable row level security;
alter table public.bookings enable row level security;

grant select on public.profiles to authenticated;
grant select on public.services, public.products, public.slides to anon, authenticated;
grant insert (name, phone, service_id, appointment_date, preferred_time, notes)
  on public.bookings to anon, authenticated;
grant select on public.bookings to authenticated;
grant update (status) on public.bookings to authenticated;
grant insert, update, delete on public.services, public.products, public.slides to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
on public.profiles for select to authenticated
using (id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Anyone can read active services" on public.services;
create policy "Anyone can read active services"
on public.services for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins can manage services" on public.services;
create policy "Admins can manage services"
on public.services for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Anyone can read active products" on public.products;
create policy "Anyone can read active products"
on public.products for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins can manage products" on public.products;
create policy "Admins can manage products"
on public.products for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Anyone can read active slides" on public.slides;
create policy "Anyone can read active slides"
on public.slides for select to anon, authenticated using (active or (select public.is_admin()));
drop policy if exists "Admins can manage slides" on public.slides;
create policy "Admins can manage slides"
on public.slides for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Visitors can request appointments" on public.bookings;
create policy "Visitors can request appointments"
on public.bookings for insert to anon, authenticated
with check (status = 'new');
drop policy if exists "Admins can view bookings" on public.bookings;
create policy "Admins can view bookings"
on public.bookings for select to authenticated using ((select public.is_admin()));
drop policy if exists "Admins can update booking status" on public.bookings;
create policy "Admins can update booking status"
on public.bookings for update to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', true, 6291456, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view catalog images" on storage.objects;
create policy "Public can view catalog images"
on storage.objects for select to public
using (bucket_id = 'catalog-images');
drop policy if exists "Admins can upload catalog images" on storage.objects;
create policy "Admins can upload catalog images"
on storage.objects for insert to authenticated
with check (bucket_id = 'catalog-images' and (select public.is_admin()));
drop policy if exists "Admins can update catalog images" on storage.objects;
create policy "Admins can update catalog images"
on storage.objects for update to authenticated
using (bucket_id = 'catalog-images' and (select public.is_admin()))
with check (bucket_id = 'catalog-images' and (select public.is_admin()));
drop policy if exists "Admins can delete catalog images" on storage.objects;
create policy "Admins can delete catalog images"
on storage.objects for delete to authenticated
using (bucket_id = 'catalog-images' and (select public.is_admin()));

insert into public.services
  (id, name, price, duration, description, features, image_url, image_alt, popular, sort_order)
values
  ('00000000-0000-4000-8000-000000000001', 'Braiding', 180, '2 – 6 hrs',
   'Beautiful braids, thoughtfully styled for you. Choose from neat knotless looks, classic cornrows and more.',
   array['Knotless braids', 'Box braids', 'Cornrows', 'Fulani braids'], '/assets/braiding-service.jpg',
   'Beautifully styled braids', true, 0),
  ('00000000-0000-4000-8000-000000000002', 'Lash Extensions', 150, '1.5 – 2 hrs',
   'A little more flutter, a lot more you. Lashes applied with care to complement your natural eye shape.',
   array['Classic lashes', 'Hybrid volume', 'Soft glam', 'Lash lift'], '/assets/lashes-service.jpg',
   'Close-up of styled lash extensions', false, 1),
  ('00000000-0000-4000-8000-000000000003', 'Cluster Lashes', 80, '45 – 60 mins',
   'A soft, effortless finish for the days you want your eyes to do the talking.',
   array['Natural clusters', 'Wispy finish', 'Lightweight feel'], '/assets/lashes-service.jpg',
   'Soft, fluttery lash extensions', false, 2),
  ('00000000-0000-4000-8000-000000000004', 'Nail Services', 80, '1 – 2.5 hrs',
   'Treat yourself to a considered manicure, from a clean natural finish to detailed nail art.',
   array['Gel nails', 'Acrylic sets', 'Nail art', 'Press-on nails'], '/assets/nails.jpg',
   'Pink and pearl nail art', true, 3),
  ('00000000-0000-4000-8000-000000000005', 'Wig Installation', null, '1.5 – 3 hrs',
   'A seamless, comfortable install finished with the detail and care your look deserves.',
   array['Custom fit', 'Natural hairline', 'Styled finish'], '/assets/wig-installation.jpg',
   'Sleek wig installation detail', false, 4)
on conflict (id) do nothing;

insert into public.products (id, name, price, subtitle, image_url, image_alt, sort_order)
values
  ('00000000-0000-4000-8000-000000000011', 'Body Wave', null, 'Soft movement. Effortless polish.',
   '/assets/wig-body-wave.jpg', 'Long, glossy body wave wig', 0),
  ('00000000-0000-4000-8000-000000000012', 'Silk Straight', null, 'A sleek classic, made to last.',
   '/assets/wig-straight.jpg', 'Sleek, straight black wig', 1),
  ('00000000-0000-4000-8000-000000000013', 'Deep Wave', null, 'Beautiful volume with a little drama.',
   '/assets/wig-deep-wave.jpg', 'Full, dark deep-wave wig', 2)
on conflict (id) do nothing;

insert into public.slides
  (id, eyebrow, headline, description, price_text, service_id, action, button_label, image_url, image_position, sort_order)
values
  ('00000000-0000-4000-8000-000000000021', 'BRAIDING', 'YOUR BEAUTY,
YOUR SIGNATURE.', 'Premium braiding crafted for your unique style.', 'From',
   '00000000-0000-4000-8000-000000000001', 'book', 'BOOK AN APPOINTMENT', '/assets/braiding.jpg', 'top', 0),
  ('00000000-0000-4000-8000-000000000022', 'WIGS', 'LUXURY HAIR.
EFFORTLESS CONFIDENCE.', 'Discover beautiful wigs and professional wig installation.', null,
   null, 'wigs', 'EXPLORE WIGS', '/assets/wig-body-wave.jpg', 'top', 1),
  ('00000000-0000-4000-8000-000000000023', 'LASHES & NAILS', 'THE FINISHING
TOUCH.', 'Complete your look with our professional beauty services.', null,
   null, 'services', 'VIEW SERVICES', '/assets/lashes.jpg', 'top', 2)
on conflict (id) do nothing;
