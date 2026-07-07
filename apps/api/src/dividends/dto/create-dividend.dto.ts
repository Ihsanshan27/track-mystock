import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateDividendDto {
  @IsString()
  stockCode!: string;

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
  @IsString()
  portfolioId?: string;
}
