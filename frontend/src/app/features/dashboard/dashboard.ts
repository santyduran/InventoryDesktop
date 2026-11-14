
import { isPlatformBrowser } from '@angular/common';
import {
  ChangeDetectorRef,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../core/services/auth.service';
import {
  InventoryMovement,
  InventoryMovementService,
} from '../../core/services/inventory-movement.service';
import { Product, ProductService } from '../../core/services/product.service';
import { brandFullName, getAppConfig } from '../../core/config/app-config';

const RECENT_LIMIT = 6;
const LOW_STOCK_LIMIT = 6;

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit {
  readonly brand = getAppConfig().brand;
  readonly brandName = brandFullName();

  private readonly productService = inject(ProductService);
  private readonly movementService = inject(InventoryMovementService);
  private readonly authService = inject(AuthService);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly cdr = inject(ChangeDetectorRef);

  loading = true;
  errorMessage = '';

  activeProducts = 0;
  inactiveProducts = 0;
  inventoryValue = 0;

  lowStockProducts: Product[] = [];
  outOfStockCount = 0;

  monthEntriesUnits = 0;
  monthEntriesCount = 0;
  monthExitsUnits = 0;
  monthExitsCount = 0;

  recentMovements: InventoryMovement[] = [];

  // "martes, 10 de noviembre de 2026" → solo la primera letra en mayúscula.
  readonly today = ((text: string) => text.charAt(0).toUpperCase() + text.slice(1))(
    new Intl.DateTimeFormat('es-CO', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date()),
  );

  get firstName(): string {
    const fullName = this.authService.getUser()?.fullName ?? '';
    return fullName.trim().split(/\s+/)[0] ?? '';
  }

  get monthName(): string {
    return new Intl.DateTimeFormat('es-CO', { month: 'long' }).format(new Date());
  }

  ngOnInit(): void {
    // Los datos dependen de la sesión del navegador; no se piden al prerenderizar.
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    forkJoin({
      products: this.productService.getProducts(),
      movements: this.movementService.getMovements(),
    }).subscribe({
      next: ({ products, movements }) => {
        this.calculateProductIndicators(products);
        this.calculateMovementIndicators(movements);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.status === 0
            ? 'No se pudo conectar con el servidor.'
            : error.error?.message || 'No fue posible cargar el resumen.';
        this.cdr.detectChanges();
      },
    });
  }

  private calculateProductIndicators(products: Product[]): void {
    const active = products.filter((product) => product.isActive);

    this.activeProducts = active.length;
    this.inactiveProducts = products.length - active.length;

    this.inventoryValue = active.reduce(
      (total, product) => total + product.stock * product.purchasePrice,
      0,
    );

    // Misma regla que la pantalla de productos: stock en o por debajo del mínimo.
    const lowStock = active
      .filter((product) => product.stock <= product.minimumStock)
      .sort(
        (a, b) =>
          a.stock - a.minimumStock - (b.stock - b.minimumStock) ||
          a.name.localeCompare(b.name),
      );

    this.outOfStockCount = lowStock.filter((product) => product.stock === 0).length;
    this.lowStockProducts = lowStock;
  }

  private calculateMovementIndicators(movements: InventoryMovement[]): void {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    this.monthEntriesUnits = 0;
    this.monthEntriesCount = 0;
    this.monthExitsUnits = 0;
    this.monthExitsCount = 0;

    for (const movement of movements) {
      if (new Date(movement.createdAt) < monthStart) {
        continue;
      }

      if (movement.movementType === 'ENTRY') {
        this.monthEntriesUnits += movement.quantity;
        this.monthEntriesCount += 1;
      } else {
        this.monthExitsUnits += movement.quantity;
        this.monthExitsCount += 1;
      }
    }

    // El backend ya los devuelve del más reciente al más antiguo.
    this.recentMovements = movements.slice(0, RECENT_LIMIT);
  }

  get visibleLowStock(): Product[] {
    return this.lowStockProducts.slice(0, LOW_STOCK_LIMIT);
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(value);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }
}
