-- Planned production database (not yet wired to frontend)
-- Run in a NEW Supabase project after reviewing RLS and migration strategy.
create extension if not exists pgcrypto;
create table if not exists companies (
 id uuid primary key default gen_random_uuid(),
 name text not null,
 country text not null,
 registration_number text,
 verification_status text not null default 'unverified'
   check (verification_status in ('unverified','pending','verified','rejected')),
 created_at timestamptz not null default now()
);
create table if not exists products (
 id uuid primary key default gen_random_uuid(),
 company_id uuid not null references companies(id),
 title text not null,
 description text,
 category text,
 currency char(3) not null default 'USD',
 min_price numeric(18,4),
 max_price numeric(18,4),
 moq numeric(18,3) not null default 1,
 unit text not null default 'MT',
 status text not null default 'draft',
 created_at timestamptz not null default now()
);
create table if not exists rfqs (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references products(id),
 buyer_email text not null,
 buyer_company_name text not null,
 quantity numeric(18,3) not null check(quantity>0),
 destination_country text not null,
 destination_port text,
 incoterm text,
 message text,
 status text not null default 'submitted',
 created_at timestamptz not null default now()
);
-- RLS defaults to deny access once enabled. Policies MUST be added
-- before production, with authenticated buyer/supplier memberships.
alter table companies enable row level security;
alter table products enable row level security;
alter table rfqs enable row level security;
