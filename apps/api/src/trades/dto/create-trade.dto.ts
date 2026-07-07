import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTradeDto {
  @IsString()
  portfolioId!: string;

  @IsOptional()
  @IsIn(['stock', 'mutual_fund'])
  assetType?: 'stock' | 'mutual_fund';

  @IsIn(['ID', 'US'])
  market!: 'ID' | 'US';

  @IsString()
  stockCode!: string;

  @IsDateString()
  dateBuy!: string;

  @IsOptional()
  @IsDateString()
  dateSell?: string | null;

  @IsNumber()
  buyPrice!: number;

  @IsOptional()
  @IsNumber()
  sellPrice?: number | null;

  @IsInt()
  @Min(1)
  lots!: number;

  @IsNumber()
  buyFee!: number;

  @IsNumber()
  sellFee!: number;

  @IsOptional()
  @IsString()
  strategy?: string;

  @IsOptional()
  @IsString()
  reasonEntry?: string;

  @IsOptional()
  @IsString()
  reasonExit?: string;

  @IsOptional()
  @IsString()
  emotion?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number | null;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
