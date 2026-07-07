import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsString()
  financeAccountId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  displayOrder?: number;
}
