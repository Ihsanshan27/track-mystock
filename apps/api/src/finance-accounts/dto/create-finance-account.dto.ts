import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateFinanceAccountDto {
  @IsString()
  name!: string;

  @IsString()
  institutionName!: string;

  @IsIn(['bank', 'ewallet'])
  type!: 'bank' | 'ewallet';

  @IsOptional()
  @IsString()
  currency?: string;

  @IsNumber()
  openingBalance!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  notes?: string;
}
