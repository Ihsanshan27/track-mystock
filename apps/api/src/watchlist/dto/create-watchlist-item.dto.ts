import { ArrayMaxSize, IsArray, IsIn, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateWatchlistItemDto {
  @IsString()
  stockCode!: string;

  @IsOptional()
  @IsNumber()
  targetPrice?: number | null;

  @IsOptional()
  @IsNumber()
  targetSellPrice?: number | null;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsIn(['waiting', 'entered', 'passed'])
  status!: 'waiting' | 'entered' | 'passed';

  @IsIn(['high', 'medium', 'low'])
  priority!: 'high' | 'medium' | 'low';

  @IsOptional()
  @IsIn(['BUY', 'SELL', 'HOLD', 'NEUTRAL', 'NONE'])
  manualRecommendation?: 'BUY' | 'SELL' | 'HOLD' | 'NEUTRAL' | 'NONE';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  categories?: string[];
}
