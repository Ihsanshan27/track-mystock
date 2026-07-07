import { PartialType } from '@nestjs/mapped-types';
import { CreateTradeReviewDto } from './create-trade-review.dto';

export class UpdateTradeReviewDto extends PartialType(CreateTradeReviewDto) {}
