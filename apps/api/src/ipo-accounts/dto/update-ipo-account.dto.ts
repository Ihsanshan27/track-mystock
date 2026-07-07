import { PartialType } from '@nestjs/mapped-types';
import { CreateIpoAccountDto } from './create-ipo-account.dto';

export class UpdateIpoAccountDto extends PartialType(CreateIpoAccountDto) {}
