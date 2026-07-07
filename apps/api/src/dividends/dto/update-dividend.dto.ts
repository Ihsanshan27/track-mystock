import { PartialType } from '@nestjs/mapped-types';
import { CreateDividendDto } from './create-dividend.dto';

export class UpdateDividendDto extends PartialType(CreateDividendDto) {}
