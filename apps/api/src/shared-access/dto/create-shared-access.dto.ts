import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreateSharedAccessDto {
  @IsString()
  granteeUserId!: string;

  @IsIn(['read', 'review', 'admin'])
  accessLevel!: 'read' | 'review' | 'admin';

  @IsOptional()
  @IsString()
  expiresAt?: string;
}
