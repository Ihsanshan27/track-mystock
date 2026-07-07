import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateIpoAccountDto {
  @IsString()
  name!: string;

  @IsString()
  email!: string;

  @IsOptional()
  @IsString()
  normalizedKey?: string;

  @IsOptional()
  @IsDateString()
  lastUsedAt?: string;
}
