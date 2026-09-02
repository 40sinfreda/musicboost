-- MusicBoost: operator Meta token (server-only), artist campaigns, payments.

create table if not exists operator_settings (
  id int primary key default 1,
  owner_user_id text,
  meta_token text,
  meta_user_name text,
  ad_account_id text,
  ad_account_name text,
  page_id text,
  page_name text,
  payout_note text,
  commission_bps int not null default 1000,
  updated_at timestamptz not null default now(),
  constraint operator_settings_one_row check (id = 1)
);

insert into operator_settings (id) values (1) on conflict (id) do nothing;

create table if not exists campaigns (
  id serial primary key,
  user_id text not null,
  title text not null,
  platform text not null,
  content_type text not null,
  media_url text not null,
  thumbnail text,
  spec_json text not null,
  daily_budget_cents int not null,
  days int not null,
  ad_cents int not null,
  fee_cents int not null,
  total_cents int not null,
  currency text not null default 'ILS',
  status text not null default 'awaiting_payment',
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  ads_manager_url text,
  error_message text,
  insights_json text,
  insights_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists campaigns_user_id_idx on campaigns (user_id);
create index if not exists campaigns_status_idx on campaigns (status);

create table if not exists payments (
  id serial primary key,
  user_id text not null,
  campaign_id int not null references campaigns(id),
  ad_cents int not null,
  fee_cents int not null,
  total_cents int not null,
  currency text not null,
  status text not null default 'pending',
  method text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists payments_user_id_idx on payments (user_id);
create index if not exists payments_campaign_id_idx on payments (campaign_id);
