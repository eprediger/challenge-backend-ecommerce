import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StockService } from './application/stock.service';
import { StockRepository } from './domain/stock.repository';
import { StockController } from './infrastructure/http/stock.controller';
import { MovimientoStockOrmEntity } from './infrastructure/persistence/movimiento-stock.orm-entity';
import { StockOrmEntity } from './infrastructure/persistence/stock.orm-entity';
import { TypeOrmStockRepository } from './infrastructure/persistence/typeorm-stock.repository';

/**
 * Binds the {@link StockRepository} port to its TypeORM adapter.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([StockOrmEntity, MovimientoStockOrmEntity]),
  ],
  controllers: [StockController],
  providers: [
    StockService,
    { provide: StockRepository, useClass: TypeOrmStockRepository },
  ],
  exports: [StockService],
})
export class StockModule {}
