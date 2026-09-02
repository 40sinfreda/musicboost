-- Order confirmation emails stored per artist after a deal is closed.

create table if not exists campaign_emails (
  id serial primary key,
  user_id text not null,
  campaign_id int not null references campaigns(id),
  to_email text not null,
  subject text not null,
  preview text not null,
  body_html text not null,
  kind text not null,
  created_at timestamptz not null default now()
);

create index if not exists campaign_emails_user_id_idx on campaign_emails (user_id);
create index if not exists campaign_emails_campaign_id_idx on campaign_emails (campaign_id);
