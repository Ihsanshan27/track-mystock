import { PartialType } from '@nestjs/mapped-types';
import { CreateIpoEntryDto } from './create-ipo-entry.dto';

export class UpdateIpoEntryDto extends PartialType(CreateIpoEntryDto) {}
