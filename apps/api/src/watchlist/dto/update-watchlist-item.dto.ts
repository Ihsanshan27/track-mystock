import { PartialType } from '@nestjs/mapped-types';
import { CreateWatchlistItemDto } from './create-watchlist-item.dto';

export class UpdateWatchlistItemDto extends PartialType(CreateWatchlistItemDto) {}
