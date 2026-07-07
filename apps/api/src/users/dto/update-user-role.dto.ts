import { IsIn } from 'class-validator';

export class UpdateUserRoleDto {
  @IsIn(['admin', 'mentor', 'trader', 'viewer'])
  role!: 'admin' | 'mentor' | 'trader' | 'viewer';
}
