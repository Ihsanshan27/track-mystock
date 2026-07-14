import { IsDateString, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { MarketCode } from '@prisma/client';

export class CreateDividendDto {
  @IsString()
  stockCode!: string;

  @IsOptional()
  @IsEnum(MarketCode)
  market?: MarketCode;

  @IsNumber()
  amountPerShare!: number;

  @IsNumber()
  @Min(1)
  lots!: number;

  @IsNumber()
  totalAmount!: number;

  @IsDateString()
  dateReceived!: string;

  @IsOptional()
  @IsDateString()
  cumDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  portfolioId?: string;
}
