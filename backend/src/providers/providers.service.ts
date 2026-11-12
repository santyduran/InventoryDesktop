
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProviderDto } from './dto/create-provider.dto.js';
import { UpdateProviderDto } from './dto/update-provider.dto.js';

const OPTIONAL_TEXT_FIELDS = [
  'verificationDigit',
  'contactName',
  'phone',
  'email',
  'address',
  'city',
  'state',
  'bankAccount',
  'observations',
] as const;

type OptionalTextField = (typeof OPTIONAL_TEXT_FIELDS)[number];

/** Recorta un texto opcional; vacío o null se guarda como null. */
function cleanOptional(value: string | null | undefined): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  return value?.trim() || null;
}

/** Recorta un texto obligatorio; si queda vacío responde 400. */
function cleanRequired(value: string, label: string): string {
  const cleaned = value.trim();

  if (!cleaned) {
    throw new BadRequestException(`${label} es obligatorio.`);
  }

  return cleaned;
}

function cleanOptionalFields(
  dto: Partial<Record<OptionalTextField, string | null>>,
): Partial<Record<OptionalTextField, string | null>> {
  const data: Partial<Record<OptionalTextField, string | null>> = {};

  for (const field of OPTIONAL_TEXT_FIELDS) {
    const value = cleanOptional(dto[field]);

    if (value !== undefined) {
      data[field] = field === 'email' && value ? value.toLowerCase() : value;
    }
  }

  return data;
}

@Injectable()
export class ProvidersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateProviderDto) {
    const businessName = cleanRequired(dto.businessName, 'La razón social');
    const nit = cleanRequired(dto.nit, 'El NIT');

    const existingProvider = await this.prisma.provider.findUnique({
      where: { nit },
    });

    if (existingProvider) {
      throw new ConflictException('Ya existe un proveedor con ese NIT');
    }

    return this.prisma.provider.create({
      data: {
        businessName,
        nit,
        ...cleanOptionalFields(dto),
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

    const data: Record<string, string | boolean | null> = {
      ...cleanOptionalFields(dto),
    };

    if (dto.businessName !== undefined) {
      data.businessName = cleanRequired(dto.businessName, 'La razón social');
    }

    if (dto.nit !== undefined) {
      const nit = cleanRequired(dto.nit, 'El NIT');

      const existingProvider = await this.prisma.provider.findFirst({
        where: {
          nit,
          NOT: { id },
        },
      });

      if (existingProvider) {
        throw new ConflictException('Ya existe otro proveedor con ese NIT');
      }

      data.nit = nit;
    }

    if (dto.isActive !== undefined) {
      data.isActive = dto.isActive;
    }

    return this.prisma.provider.update({
      where: { id },
      data,
    });
  }
}
