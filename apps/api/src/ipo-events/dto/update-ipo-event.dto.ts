import { PartialType } from '@nestjs/mapped-types';
import { CreateIpoEventDto } from './create-ipo-event.dto';

export class UpdateIpoEventDto extends PartialType(CreateIpoEventDto) {}
