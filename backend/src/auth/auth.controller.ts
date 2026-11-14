
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SetupAdminDto } from './dto/setup-admin.dto.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { AuthenticatedUser } from './strategies/jwt.strategy.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Consulta si la instalación necesita crear el administrador inicial.
   * Endpoint público.
   */
  @Get('setup-status')
  getSetupStatus() {
    return this.authService.getSetupStatus();
  }

  /**
   * Registra el primer administrador de la instalación.
   * Endpoint público, protegido desde el servicio.
   */
  @Post('setup')
  @HttpCode(HttpStatus.CREATED)
  setupAdmin(@Body() dto: SetupAdminDto) {
    return this.authService.setupAdmin(dto);
  }

  /**
   * Inicio de sesión habitual.
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(
    @Body() dto: LoginDto,
    @Req() request: { ip?: string },
  ) {
    return this.authService.login(dto, request.ip ?? 'desconocida');
  }

  /**
   * Consulta el perfil del usuario autenticado.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  getProfile(
    @Req() request: { user: AuthenticatedUser },
  ) {
    return request.user;
  }
}
