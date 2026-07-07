import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateTradeReviewDto {
  @IsString()
  tradeId!: string;

  @IsOptional()
  @IsString()
  mentorUserId?: string;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  disciplineScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  psychologyScore?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  riskScore?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  tags?: string[];
}
