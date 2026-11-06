
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProviderDto) {
    const existingProvider = await this.prisma.provider.findUnique({
      where: { nit: dto.nit },
    });

    if (existingProvider) {
      throw new ConflictException('Ya existe un proveedor con ese NIT');
    }

    return this.prisma.provider.create({
      data: {
        businessName: dto.businessName,
        nit: dto.nit,
        verificationDigit: dto.verificationDigit,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        bankAccount: dto.bankAccount,
        observations: dto.observations,
      },
    });
  }

  async findAll() {
    return this.prisma.provider.findMany({
      orderBy: { businessName: 'asc' },
      include: {
        _count: {
          select: { purchaseInvoices: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
      include: {
        _count: {
          select: { purchaseInvoices: true },
        },
      },
    });

    if (!provider) {
      throw new NotFoundException('Proveedor no encontrado');
    }

    return provider;
  }

  async update(id: string, dto: UpdateProviderDto) {
    await this.findOne(id);

    if (dto.nit) {
      const existingProvider = await this.prisma.provider.findFirst({
        where: {
          nit: dto.nit,
          NOT: { id },
        },
      });

      if (existingProvider) {
        throw new ConflictException('Ya existe otro proveedor con ese NIT');
      }
    }

    return this.prisma.provider.update({
      where: { id },
      data: {
        ...dto,
      },
    });
  }
}
