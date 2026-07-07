import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminCreateUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsIn(['admin', 'mentor', 'trader', 'viewer'])
  role!: 'admin' | 'mentor' | 'trader' | 'viewer';
}
