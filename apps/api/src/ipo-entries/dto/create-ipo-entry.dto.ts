import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateIpoEntryDto {
  @IsString()
  ipoEventId!: string;

  @IsOptional()
  @IsString()
  ipoAccountId?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1)
  no?: number;

  @IsString()
  accountName!: string;

  @IsString()
  email!: string;

  @IsNumber()
  buyPrice!: number;

  @IsInt()
  @Min(0)
  lots!: number;

  @IsNumber()
  sellPrice!: number;

  @IsIn(['SL', 'TL', '-', 'NONE'])
  slTl!: 'SL' | 'TL' | '-' | 'NONE';

  @IsIn(['SELL', 'KEEP'])
  action!: 'SELL' | 'KEEP';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  createdAt?: string;
}
