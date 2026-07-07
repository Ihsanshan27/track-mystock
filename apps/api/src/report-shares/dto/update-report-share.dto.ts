import { PartialType } from '@nestjs/mapped-types';
import { CreateReportShareDto } from './create-report-share.dto';

export class UpdateReportShareDto extends PartialType(CreateReportShareDto) {}
