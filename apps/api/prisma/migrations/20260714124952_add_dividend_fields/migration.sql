-- AlterTable
ALTER TABLE "dividends" ADD COLUMN     "cum_date" DATE,
ADD COLUMN     "market" "MarketCode" NOT NULL DEFAULT 'ID',
ADD COLUMN     "notes" TEXT;
