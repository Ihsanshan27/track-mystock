create extension if not exists pgcrypto;

do $$ begin
  create type user_status as enum ('active', 'suspended', 'invited');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type user_role as enum ('admin', 'mentor', 'trader', 'viewer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type access_level as enum ('read', 'review', 'admin');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type asset_type as enum ('stock', 'mutual_fund');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type market_code as enum ('ID', 'US');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cashflow_type as enum ('deposit', 'withdraw');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type watchlist_status as enum ('waiting', 'entered', 'passed');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type watchlist_priority as enum ('high', 'medium', 'low');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type manual_recommendation as enum ('BUY', 'SELL', 'HOLD', 'NEUTRAL', 'NONE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type finance_account_type as enum ('bank', 'ewallet');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type finance_transaction_type as enum ('income', 'expense', 'transfer_in', 'transfer_out', 'adjustment');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type currency_code as enum ('IDR');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type cashflow_sync_mode as enum ('mirror', 'transfer_to_portfolio', 'transfer_from_portfolio');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type stop_take_label as enum ('SL', 'TL', 'NONE');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type ipo_action as enum ('SELL', 'KEEP');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type share_type as enum ('portfolio_summary', 'monthly_performance', 'trade_journal', 'custom');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type theme_preference as enum ('light', 'dark', 'system');
exception
  when duplicate_object then null;
end $$;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) not null unique,
  password_hash text not null,
  email_verified_at timestamptz null,
  status user_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists profiles (
  user_id uuid primary key references users(id) on delete cascade,
  display_name varchar(255) not null,
  default_role user_role not null default 'trader',
  avatar_url text null,
  timezone varchar(100) null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  revoked_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists email_verification_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  token_hash text not null,
  expires_at timestamptz not null,
  used_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists workspaces (
  id uuid primary key default gen_random_uuid(),
  name varchar(255) not null,
  owner_user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references workspaces(id) on delete cascade,
  user_id uuid not null references users(id) on delete cascade,
  role user_role not null,
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create table if not exists shared_access (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  grantee_user_id uuid not null references users(id) on delete cascade,
  access_level access_level not null,
  expires_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid null references users(id) on delete set null,
  workspace_id uuid null references workspaces(id) on delete set null,
  action varchar(100) not null,
  target_type varchar(100) not null,
  target_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists finance_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  name varchar(255) not null,
  institution_name varchar(255) not null,
  type finance_account_type not null,
  currency currency_code not null default 'IDR',
  opening_balance numeric(18,2) not null,
  is_active boolean not null default true,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists portfolios (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  name varchar(255) not null,
  description text null,
  is_default boolean not null default false,
  display_order integer not null default 0,
  finance_account_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trades (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  asset_type asset_type not null default 'stock',
  market market_code not null,
  stock_code varchar(20) not null,
  date_buy date not null,
  date_sell date null,
  buy_price numeric(18,4) not null,
  sell_price numeric(18,4) null,
  lots integer not null,
  buy_fee numeric(18,4) not null,
  sell_fee numeric(18,4) not null,
  strategy varchar(255) null,
  reason_entry text null,
  reason_exit text null,
  emotion varchar(100) null,
  rating smallint null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trade_tags (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  tag varchar(100) not null,
  unique (trade_id, tag)
);

create table if not exists trade_audit_logs (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  edited_by_user_id uuid null references users(id) on delete set null,
  before_data jsonb not null,
  after_data jsonb not null,
  edited_at timestamptz not null default now()
);

create table if not exists cashflows (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  type cashflow_type not null,
  amount numeric(18,2) not null,
  entry_date date not null,
  notes text null,
  linked_finance_transaction_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists dividends (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  portfolio_id uuid not null references portfolios(id) on delete cascade,
  stock_code varchar(20) not null,
  amount_per_share numeric(18,4) not null,
  lots integer not null,
  total_amount numeric(18,2) not null,
  date_received date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists watchlist_items (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  stock_code varchar(20) not null,
  target_price numeric(18,4) null,
  target_sell_price numeric(18,4) null,
  reason text null,
  status watchlist_status not null,
  priority watchlist_priority not null,
  manual_recommendation manual_recommendation null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists watchlist_categories (
  id uuid primary key default gen_random_uuid(),
  watchlist_item_id uuid not null references watchlist_items(id) on delete cascade,
  category varchar(100) not null,
  unique (watchlist_item_id, category)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  title varchar(255) not null,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  account_id uuid not null references finance_accounts(id) on delete cascade,
  type finance_transaction_type not null,
  amount numeric(18,2) not null,
  entry_date date not null,
  description text not null,
  counterparty_account_id uuid null references finance_accounts(id) on delete set null,
  linked_cashflow_id uuid null,
  linked_portfolio_id uuid null references portfolios(id) on delete set null,
  cashflow_sync_mode cashflow_sync_mode null,
  category varchar(100) null,
  transfer_group_id uuid null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists finance_transaction_tags (
  id uuid primary key default gen_random_uuid(),
  finance_transaction_id uuid not null references finance_transactions(id) on delete cascade,
  tag varchar(100) not null,
  unique (finance_transaction_id, tag)
);

create table if not exists ipo_events (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  stock_code varchar(20) not null,
  underwriter varchar(255) null,
  offering_date date null,
  ipo_date date not null,
  offering_price numeric(18,2) not null,
  notes text null,
  sector varchar(100) null,
  registrar varchar(255) null,
  target_board varchar(100) null,
  bookbuilding_start_date date null,
  bookbuilding_end_date date null,
  lot_pooling_amount numeric(8,2) null,
  allotment_date date null,
  refund_date date null,
  distribution_date date null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ipo_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  name varchar(255) not null,
  email varchar(255) not null,
  normalized_key varchar(255) not null,
  last_used_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists ipo_entries (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  ipo_event_id uuid not null references ipo_events(id) on delete cascade,
  ipo_account_id uuid null references ipo_accounts(id) on delete set null,
  row_no integer not null,
  account_name varchar(255) not null,
  email varchar(255) not null,
  buy_price numeric(18,2) not null,
  lots integer not null,
  sell_price numeric(18,2) not null,
  sl_tl stop_take_label not null,
  action ipo_action not null,
  notes text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trade_reviews (
  id uuid primary key default gen_random_uuid(),
  trade_id uuid not null references trades(id) on delete cascade,
  owner_user_id uuid not null references users(id) on delete cascade,
  mentor_user_id uuid not null references users(id) on delete cascade,
  comment text null,
  discipline_score smallint null,
  psychology_score smallint null,
  risk_score smallint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists trade_review_tags (
  id uuid primary key default gen_random_uuid(),
  trade_review_id uuid not null references trade_reviews(id) on delete cascade,
  tag varchar(100) not null,
  unique (trade_review_id, tag)
);

create table if not exists report_shares (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  portfolio_id uuid null references portfolios(id) on delete set null,
  share_key varchar(255) not null unique,
  title varchar(255) not null,
  share_type share_type not null,
  is_public boolean not null default false,
  expires_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists app_settings (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references users(id) on delete cascade,
  workspace_id uuid null references workspaces(id) on delete set null,
  initial_capital numeric(18,2) not null,
  monthly_target numeric(18,2) not null,
  default_buy_fee numeric(8,4) not null,
  default_sell_fee numeric(8,4) not null,
  theme_preference theme_preference not null default 'system',
  privacy_mode boolean not null default false,
  default_risk_percent numeric(8,4) null,
  default_target_rr numeric(8,4) null,
  extra jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, workspace_id)
);

alter table portfolios
  add constraint portfolios_finance_account_id_fkey
  foreign key (finance_account_id) references finance_accounts(id) on delete set null;

alter table cashflows
  add constraint cashflows_linked_finance_transaction_id_fkey
  foreign key (linked_finance_transaction_id) references finance_transactions(id) on delete set null;

alter table finance_transactions
  add constraint finance_transactions_linked_cashflow_id_fkey
  foreign key (linked_cashflow_id) references cashflows(id) on delete set null;

create index if not exists refresh_tokens_user_id_idx on refresh_tokens(user_id);
create index if not exists password_reset_tokens_user_id_idx on password_reset_tokens(user_id);
create index if not exists email_verification_tokens_user_id_idx on email_verification_tokens(user_id);
create index if not exists workspaces_owner_user_id_idx on workspaces(owner_user_id);
create index if not exists workspace_members_user_id_idx on workspace_members(user_id);
create index if not exists shared_access_owner_user_id_idx on shared_access(owner_user_id);
create index if not exists shared_access_grantee_user_id_idx on shared_access(grantee_user_id);
create index if not exists audit_logs_actor_user_id_idx on audit_logs(actor_user_id);
create index if not exists audit_logs_workspace_id_idx on audit_logs(workspace_id);
create index if not exists audit_logs_target_type_target_id_idx on audit_logs(target_type, target_id);
create index if not exists portfolios_owner_user_id_idx on portfolios(owner_user_id);
create index if not exists portfolios_workspace_id_idx on portfolios(workspace_id);
create index if not exists trades_owner_user_id_idx on trades(owner_user_id);
create index if not exists trades_workspace_id_idx on trades(workspace_id);
create index if not exists trades_portfolio_id_idx on trades(portfolio_id);
create index if not exists trades_stock_code_idx on trades(stock_code);
create index if not exists trade_audit_logs_trade_id_idx on trade_audit_logs(trade_id);
create index if not exists cashflows_owner_user_id_idx on cashflows(owner_user_id);
create index if not exists cashflows_workspace_id_idx on cashflows(workspace_id);
create index if not exists cashflows_portfolio_id_idx on cashflows(portfolio_id);
create index if not exists dividends_owner_user_id_idx on dividends(owner_user_id);
create index if not exists dividends_portfolio_id_idx on dividends(portfolio_id);
create index if not exists watchlist_items_owner_user_id_idx on watchlist_items(owner_user_id);
create index if not exists watchlist_items_stock_code_idx on watchlist_items(stock_code);
create index if not exists notes_owner_user_id_idx on notes(owner_user_id);
create index if not exists finance_accounts_owner_user_id_idx on finance_accounts(owner_user_id);
create index if not exists finance_transactions_owner_user_id_idx on finance_transactions(owner_user_id);
create index if not exists finance_transactions_account_id_idx on finance_transactions(account_id);
create index if not exists finance_transactions_linked_portfolio_id_idx on finance_transactions(linked_portfolio_id);
create index if not exists finance_transactions_transfer_group_id_idx on finance_transactions(transfer_group_id);
create index if not exists ipo_events_owner_user_id_idx on ipo_events(owner_user_id);
create index if not exists ipo_events_stock_code_idx on ipo_events(stock_code);
create index if not exists ipo_accounts_owner_user_id_idx on ipo_accounts(owner_user_id);
create index if not exists ipo_accounts_normalized_key_idx on ipo_accounts(normalized_key);
create index if not exists ipo_entries_owner_user_id_idx on ipo_entries(owner_user_id);
create index if not exists ipo_entries_ipo_event_id_idx on ipo_entries(ipo_event_id);
create index if not exists ipo_entries_ipo_account_id_idx on ipo_entries(ipo_account_id);
create index if not exists trade_reviews_trade_id_idx on trade_reviews(trade_id);
create index if not exists trade_reviews_mentor_user_id_idx on trade_reviews(mentor_user_id);
create index if not exists report_shares_owner_user_id_idx on report_shares(owner_user_id);
create index if not exists report_shares_share_key_idx on report_shares(share_key);

drop trigger if exists set_users_updated_at on users;
create trigger set_users_updated_at before update on users for each row execute function set_updated_at();
drop trigger if exists set_profiles_updated_at on profiles;
create trigger set_profiles_updated_at before update on profiles for each row execute function set_updated_at();
drop trigger if exists set_workspaces_updated_at on workspaces;
create trigger set_workspaces_updated_at before update on workspaces for each row execute function set_updated_at();
drop trigger if exists set_finance_accounts_updated_at on finance_accounts;
create trigger set_finance_accounts_updated_at before update on finance_accounts for each row execute function set_updated_at();
drop trigger if exists set_portfolios_updated_at on portfolios;
create trigger set_portfolios_updated_at before update on portfolios for each row execute function set_updated_at();
drop trigger if exists set_trades_updated_at on trades;
create trigger set_trades_updated_at before update on trades for each row execute function set_updated_at();
drop trigger if exists set_cashflows_updated_at on cashflows;
create trigger set_cashflows_updated_at before update on cashflows for each row execute function set_updated_at();
drop trigger if exists set_dividends_updated_at on dividends;
create trigger set_dividends_updated_at before update on dividends for each row execute function set_updated_at();
drop trigger if exists set_watchlist_items_updated_at on watchlist_items;
create trigger set_watchlist_items_updated_at before update on watchlist_items for each row execute function set_updated_at();
drop trigger if exists set_notes_updated_at on notes;
create trigger set_notes_updated_at before update on notes for each row execute function set_updated_at();
drop trigger if exists set_finance_transactions_updated_at on finance_transactions;
create trigger set_finance_transactions_updated_at before update on finance_transactions for each row execute function set_updated_at();
drop trigger if exists set_ipo_events_updated_at on ipo_events;
create trigger set_ipo_events_updated_at before update on ipo_events for each row execute function set_updated_at();
drop trigger if exists set_ipo_accounts_updated_at on ipo_accounts;
create trigger set_ipo_accounts_updated_at before update on ipo_accounts for each row execute function set_updated_at();
drop trigger if exists set_ipo_entries_updated_at on ipo_entries;
create trigger set_ipo_entries_updated_at before update on ipo_entries for each row execute function set_updated_at();
drop trigger if exists set_trade_reviews_updated_at on trade_reviews;
create trigger set_trade_reviews_updated_at before update on trade_reviews for each row execute function set_updated_at();
drop trigger if exists set_report_shares_updated_at on report_shares;
create trigger set_report_shares_updated_at before update on report_shares for each row execute function set_updated_at();
drop trigger if exists set_app_settings_updated_at on app_settings;
create trigger set_app_settings_updated_at before update on app_settings for each row execute function set_updated_at();
