
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { InventoryService } from './inventory.service.js';
import { CreateInventoryMovementDto } from './dto/create-inventory-movement.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';

@Controller('inventory')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
  ) {}

  @Post('movements')
  createMovement(
    @Body() dto: CreateInventoryMovementDto,
    @Req() request: { user: AuthenticatedUser },
  ) {
    return this.inventoryService.createMovement(
      dto,
      request.user.id,
    );
  }

  @Get('movements')
  findAll() {
    return this.inventoryService.findAll();
  }

  @Get('movements/product/:productId')
  findByProduct(@Param('productId') productId: string) {
    return this.inventoryService.findByProduct(productId);
  }
}
