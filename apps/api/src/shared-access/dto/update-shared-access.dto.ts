import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpdateSharedAccessDto {
  @IsOptional()
  @IsIn(['read', 'review', 'admin'])
  accessLevel?: 'read' | 'review' | 'admin';

  @IsOptional()
  @IsString()
  expiresAt?: string | null;
}
