
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  InventoryMovement,
  InventoryMovementService,
  CreateInventoryMovementDto,
} from '../../core/services/inventory-movement.service';

import {
  Product,
  ProductService,
} from '../../core/services/product.service';

@Component({
  selector: 'app-inventory-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory-movements.html',
  styleUrl: './inventory-movements.scss',
})
export class InventoryMovements implements OnInit {
  private readonly movementService = inject(InventoryMovementService);
  private readonly productService = inject(ProductService);
  private readonly cdr = inject(ChangeDetectorRef);

  movements: InventoryMovement[] = [];
  products: Product[] = [];

  loading = false;
  saving = false;
  showForm = false;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  movementFilter = 'ALL';

  form: CreateInventoryMovementDto = this.emptyForm();

  ngOnInit(): void {
    this.loadProducts();
    this.loadMovements();
  }

  get filteredMovements(): InventoryMovement[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.movements.filter((movement) => {
      const productName = movement.product?.name ?? '';
      const productCode = movement.product?.code ?? '';
      const responsible = movement.user?.fullName ?? '';

      const matchesSearch =
        !term ||
        productName.toLowerCase().includes(term) ||
        productCode.toLowerCase().includes(term) ||
        responsible.toLowerCase().includes(term);

      const matchesType =
        this.movementFilter === 'ALL' ||
        movement.movementType === this.movementFilter;

      return matchesSearch && matchesType;
    });
  }

  get activeProducts(): Product[] {
    return this.products.filter((product) => product.isActive);
  }

  loadProducts(): void {
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'No fue posible cargar los productos.';
        this.cdr.detectChanges();
      },
    });
  }

  loadMovements(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.movementService.getMovements().subscribe({
      next: (data) => {
        this.movements = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible cargar los movimientos de inventario.';
        this.cdr.detectChanges();
      },
    });
  }

  openForm(): void {
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    if (this.saving) return;

    this.showForm = false;
    this.form = this.emptyForm();
    this.cdr.detectChanges();
  }

  get selectedProduct(): Product | undefined {
    return this.products.find(
      (product) => product.id === this.form.productId,
    );
  }

  get resultingStock(): number | null {
    const product = this.selectedProduct;
    const quantity = Number(this.form.quantity);

    if (!product || !Number.isInteger(quantity) || quantity < 1) {
      return null;
    }

    return this.form.movementType === 'ENTRY'
      ? product.stock + quantity
      : product.stock - quantity;
  }

  saveMovement(): void {
    if (!this.form.productId) {
      this.errorMessage = 'Debes seleccionar un producto.';
      this.cdr.detectChanges();
      return;
    }

    const quantity = Number(this.form.quantity);

    if (!Number.isInteger(quantity) || quantity < 1) {
      this.errorMessage = 'La cantidad debe ser un número entero mayor que cero.';
      this.cdr.detectChanges();
      return;
    }

    if (
      this.form.movementType === 'EXIT' &&
      this.selectedProduct &&
      quantity > this.selectedProduct.stock
    ) {
      this.errorMessage = 'No hay existencias suficientes para realizar esta salida.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateInventoryMovementDto = {
      productId: this.form.productId,
      movementType: this.form.movementType,
      quantity,
      observations: this.form.observations?.trim() || undefined,
    };

    this.saving = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.movementService.createMovement(payload).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage =
          this.form.movementType === 'ENTRY'
            ? 'Entrada de inventario registrada correctamente.'
            : 'Salida de inventario registrada correctamente.';

        this.form = this.emptyForm();
        this.cdr.detectChanges();

        this.loadProducts();
        this.loadMovements();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible registrar el movimiento.';
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  }

  private emptyForm(): CreateInventoryMovementDto {
    return {
      productId: '',
      movementType: 'ENTRY',
      quantity: 1,
      observations: '',
    };
  }
}
