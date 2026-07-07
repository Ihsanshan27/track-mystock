import { IsDateString, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateCashflowDto {
  @IsIn(['deposit', 'withdraw'])
  type!: 'deposit' | 'withdraw';

  @IsNumber()
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  portfolioId?: string;

  @IsOptional()
  @IsString()
  linkedFinanceTransactionId?: string;
}
