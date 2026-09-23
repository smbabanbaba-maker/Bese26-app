-- Refresh public Boost packages for the Bese26 launch pricing.
-- The internal Included 3-day boost remains private for plan credits.

alter table public.boost_packages add column if not exists is_public boolean not null default true;

update public.boost_packages
set name = 'Starter Boost', duration_days = 3, price_kobo = 50000, placement = 'featured', is_active = true, is_public = true
where name = 'Featured · 3 days';

update public.boost_packages
set name = 'Standard Boost', duration_days = 7, price_kobo = 100000, placement = 'featured', is_active = true, is_public = true
where name = 'Featured · 7 days';

update public.boost_packages
set name = 'Included 3-day boost', duration_days = 3, price_kobo = 1, placement = 'featured', is_active = true, is_public = false
where name = 'Included 3-day boost';

update public.boost_packages
set is_active = false, is_public = false
where name = 'Top search · 7 days';

insert into public.boost_packages (name, duration_days, price_kobo, placement, is_active, is_public)
select 'Popular Boost', 14, 200000, 'homepage', true, true
where not exists (select 1 from public.boost_packages where name = 'Popular Boost');

insert into public.boost_packages (name, duration_days, price_kobo, placement, is_active, is_public)
select 'Premium Boost', 30, 350000, 'homepage', true, true
where not exists (select 1 from public.boost_packages where name = 'Premium Boost');

create index if not exists boost_packages_public_active_idx
on public.boost_packages (is_public, is_active, duration_days);
