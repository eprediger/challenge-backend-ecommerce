import { Module } from '@nestjs/common';
import { StockService } from './application/stock.service';
import { StockRepository } from './domain/stock.repository';
import { StockController } from './infrastructure/http/stock.controller';
import { TypeOrmStockRepository } from './infrastructure/persistence/typeorm-stock.repository';

/**
 * Binds the {@link StockRepository} port to its TypeORM adapter.
 */
@Module({
  controllers: [StockController],
  providers: [
    StockService,
    { provide: StockRepository, useClass: TypeOrmStockRepository },
  ],
  exports: [StockService],
})
export class StockModule {}
