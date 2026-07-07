/*
  Warnings:

  - The `theme_preference` column on the `app_settings` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `currency` column on the `finance_accounts` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `cashflow_sync_mode` column on the `finance_transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `default_role` column on the `profiles` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `asset_type` column on the `trades` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `manual_recommendation` column on the `watchlist_items` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `type` on the `cashflows` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `finance_accounts` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `type` on the `finance_transactions` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sl_tl` on the `ipo_entries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `action` on the `ipo_entries` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `share_type` on the `report_shares` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `access_level` on the `shared_access` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `market` on the `trades` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `watchlist_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `priority` on the `watchlist_items` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `role` on the `workspace_members` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('active', 'suspended', 'invited');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'mentor', 'trader', 'viewer');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('read', 'review', 'admin');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('stock', 'mutual_fund');

-- CreateEnum
CREATE TYPE "MarketCode" AS ENUM ('ID', 'US');

-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('deposit', 'withdraw');

-- CreateEnum
CREATE TYPE "WatchlistStatus" AS ENUM ('waiting', 'entered', 'passed');

-- CreateEnum
CREATE TYPE "WatchlistPriority" AS ENUM ('high', 'medium', 'low');

-- CreateEnum
CREATE TYPE "ManualRecommendation" AS ENUM ('BUY', 'SELL', 'HOLD', 'NEUTRAL', 'NONE');

-- CreateEnum
CREATE TYPE "FinanceAccountType" AS ENUM ('bank', 'ewallet');

-- CreateEnum
CREATE TYPE "FinanceTransactionType" AS ENUM ('income', 'expense', 'transfer_in', 'transfer_out', 'adjustment');

-- CreateEnum
CREATE TYPE "CurrencyCode" AS ENUM ('IDR');

-- CreateEnum
CREATE TYPE "CashflowSyncMode" AS ENUM ('mirror', 'transfer_to_portfolio', 'transfer_from_portfolio');

-- CreateEnum
CREATE TYPE "StopTakeLabel" AS ENUM ('SL', 'TL', 'NONE');

-- CreateEnum
CREATE TYPE "IpoAction" AS ENUM ('SELL', 'KEEP');

-- CreateEnum
CREATE TYPE "ShareType" AS ENUM ('portfolio_summary', 'monthly_performance', 'trade_journal', 'custom');

-- CreateEnum
CREATE TYPE "ThemePreference" AS ENUM ('light', 'dark', 'system');

-- DropForeignKey
ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "app_settings" DROP CONSTRAINT "app_settings_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_actor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "cashflows" DROP CONSTRAINT "cashflows_linked_finance_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "cashflows" DROP CONSTRAINT "cashflows_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "cashflows" DROP CONSTRAINT "cashflows_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "cashflows" DROP CONSTRAINT "cashflows_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "dividends" DROP CONSTRAINT "dividends_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "dividends" DROP CONSTRAINT "dividends_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "dividends" DROP CONSTRAINT "dividends_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "email_verification_tokens" DROP CONSTRAINT "email_verification_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_accounts" DROP CONSTRAINT "finance_accounts_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_accounts" DROP CONSTRAINT "finance_accounts_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transaction_tags" DROP CONSTRAINT "finance_transaction_tags_finance_transaction_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_account_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_counterparty_account_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_linked_cashflow_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_linked_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "finance_transactions" DROP CONSTRAINT "finance_transactions_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_accounts" DROP CONSTRAINT "ipo_accounts_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_accounts" DROP CONSTRAINT "ipo_accounts_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_entries" DROP CONSTRAINT "ipo_entries_ipo_account_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_entries" DROP CONSTRAINT "ipo_entries_ipo_event_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_entries" DROP CONSTRAINT "ipo_entries_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_entries" DROP CONSTRAINT "ipo_entries_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_events" DROP CONSTRAINT "ipo_events_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "ipo_events" DROP CONSTRAINT "ipo_events_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "notes" DROP CONSTRAINT "notes_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "password_reset_tokens" DROP CONSTRAINT "password_reset_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolios" DROP CONSTRAINT "portfolios_finance_account_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolios" DROP CONSTRAINT "portfolios_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "portfolios" DROP CONSTRAINT "portfolios_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "profiles" DROP CONSTRAINT "profiles_user_id_fkey";

-- DropForeignKey
ALTER TABLE "refresh_tokens" DROP CONSTRAINT "refresh_tokens_user_id_fkey";

-- DropForeignKey
ALTER TABLE "report_shares" DROP CONSTRAINT "report_shares_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "report_shares" DROP CONSTRAINT "report_shares_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "report_shares" DROP CONSTRAINT "report_shares_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "shared_access" DROP CONSTRAINT "shared_access_grantee_user_id_fkey";

-- DropForeignKey
ALTER TABLE "shared_access" DROP CONSTRAINT "shared_access_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_audit_logs" DROP CONSTRAINT "trade_audit_logs_edited_by_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_audit_logs" DROP CONSTRAINT "trade_audit_logs_trade_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_review_tags" DROP CONSTRAINT "trade_review_tags_trade_review_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_reviews" DROP CONSTRAINT "trade_reviews_mentor_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_reviews" DROP CONSTRAINT "trade_reviews_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_reviews" DROP CONSTRAINT "trade_reviews_trade_id_fkey";

-- DropForeignKey
ALTER TABLE "trade_tags" DROP CONSTRAINT "trade_tags_trade_id_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_portfolio_id_fkey";

-- DropForeignKey
ALTER TABLE "trades" DROP CONSTRAINT "trades_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "watchlist_categories" DROP CONSTRAINT "watchlist_categories_watchlist_item_id_fkey";

-- DropForeignKey
ALTER TABLE "watchlist_items" DROP CONSTRAINT "watchlist_items_owner_user_id_fkey";

-- DropForeignKey
ALTER TABLE "watchlist_items" DROP CONSTRAINT "watchlist_items_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_user_id_fkey";

-- DropForeignKey
ALTER TABLE "workspace_members" DROP CONSTRAINT "workspace_members_workspace_id_fkey";

-- DropForeignKey
ALTER TABLE "workspaces" DROP CONSTRAINT "workspaces_owner_user_id_fkey";

-- AlterTable
ALTER TABLE "app_settings" DROP COLUMN "theme_preference",
ADD COLUMN     "theme_preference" "ThemePreference" NOT NULL DEFAULT 'system',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "cashflows" DROP COLUMN "type",
ADD COLUMN     "type" "CashflowType" NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "dividends" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_accounts" DROP COLUMN "type",
ADD COLUMN     "type" "FinanceAccountType" NOT NULL,
DROP COLUMN "currency",
ADD COLUMN     "currency" "CurrencyCode" NOT NULL DEFAULT 'IDR',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "finance_transactions" DROP COLUMN "type",
ADD COLUMN     "type" "FinanceTransactionType" NOT NULL,
DROP COLUMN "cashflow_sync_mode",
ADD COLUMN     "cashflow_sync_mode" "CashflowSyncMode",
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ipo_accounts" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ipo_entries" DROP COLUMN "sl_tl",
ADD COLUMN     "sl_tl" "StopTakeLabel" NOT NULL,
DROP COLUMN "action",
ADD COLUMN     "action" "IpoAction" NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ipo_events" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "notes" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "portfolios" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "profiles" DROP COLUMN "default_role",
ADD COLUMN     "default_role" "UserRole" NOT NULL DEFAULT 'trader',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "report_shares" DROP COLUMN "share_type",
ADD COLUMN     "share_type" "ShareType" NOT NULL,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "shared_access" DROP COLUMN "access_level",
ADD COLUMN     "access_level" "AccessLevel" NOT NULL;

-- AlterTable
ALTER TABLE "trade_reviews" ALTER COLUMN "discipline_score" SET DATA TYPE INTEGER,
ALTER COLUMN "psychology_score" SET DATA TYPE INTEGER,
ALTER COLUMN "risk_score" SET DATA TYPE INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "trades" DROP COLUMN "asset_type",
ADD COLUMN     "asset_type" "AssetType" NOT NULL DEFAULT 'stock',
DROP COLUMN "market",
ADD COLUMN     "market" "MarketCode" NOT NULL,
ALTER COLUMN "rating" SET DATA TYPE INTEGER,
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "users" DROP COLUMN "status",
ADD COLUMN     "status" "UserStatus" NOT NULL DEFAULT 'active',
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "watchlist_items" DROP COLUMN "status",
ADD COLUMN     "status" "WatchlistStatus" NOT NULL,
DROP COLUMN "priority",
ADD COLUMN     "priority" "WatchlistPriority" NOT NULL,
DROP COLUMN "manual_recommendation",
ADD COLUMN     "manual_recommendation" "ManualRecommendation",
ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "workspace_members" DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL;

-- AlterTable
ALTER TABLE "workspaces" ALTER COLUMN "updated_at" DROP DEFAULT;

-- DropEnum
DROP TYPE "access_level";

-- DropEnum
DROP TYPE "asset_type";

-- DropEnum
DROP TYPE "cashflow_sync_mode";

-- DropEnum
DROP TYPE "cashflow_type";

-- DropEnum
DROP TYPE "currency_code";

-- DropEnum
DROP TYPE "finance_account_type";

-- DropEnum
DROP TYPE "finance_transaction_type";

-- DropEnum
DROP TYPE "ipo_action";

-- DropEnum
DROP TYPE "manual_recommendation";

-- DropEnum
DROP TYPE "market_code";

-- DropEnum
DROP TYPE "share_type";

-- DropEnum
DROP TYPE "stop_take_label";

-- DropEnum
DROP TYPE "theme_preference";

-- DropEnum
DROP TYPE "user_role";

-- DropEnum
DROP TYPE "user_status";

-- DropEnum
DROP TYPE "watchlist_priority";

-- DropEnum
DROP TYPE "watchlist_status";

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_verification_tokens" ADD CONSTRAINT "email_verification_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspaces" ADD CONSTRAINT "workspaces_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workspace_members" ADD CONSTRAINT "workspace_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shared_access" ADD CONSTRAINT "shared_access_grantee_user_id_fkey" FOREIGN KEY ("grantee_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "portfolios" ADD CONSTRAINT "portfolios_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trades" ADD CONSTRAINT "trades_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_tags" ADD CONSTRAINT "trade_tags_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_audit_logs" ADD CONSTRAINT "trade_audit_logs_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_audit_logs" ADD CONSTRAINT "trade_audit_logs_edited_by_user_id_fkey" FOREIGN KEY ("edited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflows" ADD CONSTRAINT "cashflows_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflows" ADD CONSTRAINT "cashflows_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cashflows" ADD CONSTRAINT "cashflows_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_items" ADD CONSTRAINT "watchlist_items_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "watchlist_categories" ADD CONSTRAINT "watchlist_categories_watchlist_item_id_fkey" FOREIGN KEY ("watchlist_item_id") REFERENCES "watchlist_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notes" ADD CONSTRAINT "notes_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_accounts" ADD CONSTRAINT "finance_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "finance_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_counterparty_account_id_fkey" FOREIGN KEY ("counterparty_account_id") REFERENCES "finance_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transaction_tags" ADD CONSTRAINT "finance_transaction_tags_finance_transaction_id_fkey" FOREIGN KEY ("finance_transaction_id") REFERENCES "finance_transactions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_events" ADD CONSTRAINT "ipo_events_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_events" ADD CONSTRAINT "ipo_events_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_accounts" ADD CONSTRAINT "ipo_accounts_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_accounts" ADD CONSTRAINT "ipo_accounts_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_entries" ADD CONSTRAINT "ipo_entries_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_entries" ADD CONSTRAINT "ipo_entries_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_entries" ADD CONSTRAINT "ipo_entries_ipo_event_id_fkey" FOREIGN KEY ("ipo_event_id") REFERENCES "ipo_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ipo_entries" ADD CONSTRAINT "ipo_entries_ipo_account_id_fkey" FOREIGN KEY ("ipo_account_id") REFERENCES "ipo_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_reviews" ADD CONSTRAINT "trade_reviews_trade_id_fkey" FOREIGN KEY ("trade_id") REFERENCES "trades"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_reviews" ADD CONSTRAINT "trade_reviews_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_reviews" ADD CONSTRAINT "trade_reviews_mentor_user_id_fkey" FOREIGN KEY ("mentor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trade_review_tags" ADD CONSTRAINT "trade_review_tags_trade_review_id_fkey" FOREIGN KEY ("trade_review_id") REFERENCES "trade_reviews"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "report_shares" ADD CONSTRAINT "report_shares_portfolio_id_fkey" FOREIGN KEY ("portfolio_id") REFERENCES "portfolios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;
