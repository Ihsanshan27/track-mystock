import { IsIn, IsString } from 'class-validator';

const WORKSPACE_ROLES = ['admin', 'mentor', 'trader', 'viewer'] as const;

export class UpsertWorkspaceMemberDto {
  @IsString()
  userId!: string;

  @IsString()
  @IsIn(WORKSPACE_ROLES)
  role!: (typeof WORKSPACE_ROLES)[number];
}
