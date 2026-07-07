import { IsDateString, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateIpoEventDto {
  @IsString()
  stockCode!: string;

  @IsOptional()
  @IsString()
  underwriter?: string;

  @IsOptional()
  @IsDateString()
  offeringDate?: string;

  @IsDateString()
  ipoDate!: string;

  @IsNumber()
  offeringPrice!: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  sector?: string;

  @IsOptional()
  @IsString()
  registrar?: string;

  @IsOptional()
  @IsString()
  targetBoard?: string;

  @IsOptional()
  @IsDateString()
  bookbuildingStartDate?: string;

  @IsOptional()
  @IsDateString()
  bookbuildingEndDate?: string;

  @IsOptional()
  @IsNumber()
  lotPoolingAmount?: number;

  @IsOptional()
  @IsDateString()
  allotmentDate?: string;

  @IsOptional()
  @IsDateString()
  refundDate?: string;

  @IsOptional()
  @IsDateString()
  distributionDate?: string;
}
