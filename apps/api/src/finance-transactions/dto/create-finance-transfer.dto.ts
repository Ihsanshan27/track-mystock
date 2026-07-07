import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFinanceTransferDto {
  @IsString()
  fromAccountId!: string;

  @IsString()
  toAccountId!: string;

  @IsNumber()
  amount!: number;

  @IsString()
  date!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
