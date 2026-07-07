import { IsBoolean, IsIn, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateReportShareDto {
  @IsOptional()
  @IsString()
  portfolioId?: string;

  @IsString()
  title!: string;

  @IsIn(['portfolio_summary', 'monthly_performance', 'trade_journal', 'custom'])
  shareType!: 'portfolio_summary' | 'monthly_performance' | 'trade_journal' | 'custom';

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @IsOptional()
  @IsString()
  expiresAt?: string;

  @IsOptional()
  @IsObject()
  snapshot?: Record<string, unknown>;
}
