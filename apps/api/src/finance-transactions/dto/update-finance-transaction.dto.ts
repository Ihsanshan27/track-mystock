import { PartialType } from '@nestjs/mapped-types';
import { CreateFinanceTransactionDto } from './create-finance-transaction.dto';

export class UpdateFinanceTransactionDto extends PartialType(CreateFinanceTransactionDto) {}
