import { ArrayMaxSize, IsArray, IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFinanceTransactionDto {
  @IsString()
  accountId!: string;

  @IsIn(['income', 'expense', 'transfer_in', 'transfer_out', 'adjustment'])
  type!: 'income' | 'expense' | 'transfer_in' | 'transfer_out' | 'adjustment';

  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  counterpartyAccountId?: string | null;

  @IsOptional()
  @IsString()
  linkedCashflowId?: string | null;

  @IsOptional()
  @IsString()
  linkedPortfolioId?: string | null;

  @IsOptional()
  @IsIn(['mirror', 'transfer_to_portfolio', 'transfer_from_portfolio'])
  cashflowSyncMode?: 'mirror' | 'transfer_to_portfolio' | 'transfer_from_portfolio';

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  transferGroupId?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
