import { PartialType } from '@nestjs/mapped-types';
import { CreateFinanceAccountDto } from './create-finance-account.dto';

export class UpdateFinanceAccountDto extends PartialType(CreateFinanceAccountDto) {}
