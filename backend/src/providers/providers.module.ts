
import { Module } from '@nestjs/common';

import { ProvidersController } from './providers.controller.js';
import { ProvidersService } from './providers.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
