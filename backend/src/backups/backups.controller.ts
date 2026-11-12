import {
  Controller,
  Get,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';

import { BackupsService } from './backups.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuthenticatedUser } from '../auth/strategies/jwt.strategy.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../common/enums/user-role.enum.js';

@Controller('backups')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  findAll() {
    return this.backupsService.findAll();
  }

  @Post()
  create(@Req() request: { user: AuthenticatedUser }) {
    return this.backupsService.createManual(request.user.id);
  }

  @Get(':fileName/download')
  download(@Param('fileName') fileName: string, @Res() response: Response) {
    response.download(this.backupsService.getFilePath(fileName), fileName);
  }
}
