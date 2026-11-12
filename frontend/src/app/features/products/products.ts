
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  ProductService,
  Product,
  ProductCategory,
  CreateProductDto,
} from '../../core/services/product.service';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.html',
  styleUrl: './products.scss',
})
export class Products implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  products: Product[] = [];
  categories: ProductCategory[] = [];

  searchTerm = '';
  statusFilter = 'ALL';

  loading = false;
  saving = false;
  errorMessage = '';
  successMessage = '';

  showForm = false;
  editingProductId: string | null = null;

  form = this.emptyForm();

  ngOnInit(): void {
    this.loadCategories();
    this.loadProducts();
  }

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  get filteredProducts(): Product[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.products.filter((product) => {
      const matchesSearch =
        !search ||
        product.code.toLowerCase().includes(search) ||
        product.name.toLowerCase().includes(search) ||
        (product.barcode ?? '').toLowerCase().includes(search) ||
        (product.category?.name ?? '').toLowerCase().includes(search);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && product.isActive) ||
        (this.statusFilter === 'INACTIVE' && !product.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  loadProducts(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.productService.getProducts().subscribe({
      next: (products) => {
        this.products = products;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible cargar los productos.';
        this.cdr.detectChanges();
      },
    });
  }

  loadCategories(): void {
    this.productService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories.filter(
          (category) => category.isActive,
        );
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage =
          'No fue posible cargar las categorías.';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    this.editingProductId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEditForm(product: Product): void {
    this.editingProductId = product.id;

    this.form = {
      code: product.code,
      barcode: product.barcode ?? '',
      name: product.name,
      description: product.description ?? '',
      categoryId: product.categoryId,
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      taxType: product.taxType,
      taxRate: product.taxRate,
      stock: product.stock,
      minimumStock: product.minimumStock,
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.editingProductId = null;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  saveProduct(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (
      !this.form.code.trim() ||
      !this.form.name.trim() ||
      !this.form.categoryId
    ) {
      this.errorMessage =
        'Completa el código, nombre y categoría del producto.';
      this.cdr.detectChanges();
      return;
    }

    if (
      this.form.purchasePrice < 0 ||
      this.form.salePrice < 0 ||
      this.form.stock < 0 ||
      this.form.minimumStock < 0
    ) {
      this.errorMessage =
        'Los precios y las cantidades no pueden ser negativos.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateProductDto = {
      code: this.form.code.trim(),
      name: this.form.name.trim(),
      categoryId: this.form.categoryId,
      purchasePrice: Number(this.form.purchasePrice),
      salePrice: Number(this.form.salePrice),
      taxType: this.form.taxType,
      taxRate: Number(this.form.taxRate),
      stock: Number(this.form.stock),
      minimumStock: Number(this.form.minimumStock),
      ...(this.form.barcode.trim()
        ? { barcode: this.form.barcode.trim() }
        : {}),
      ...(this.form.description.trim()
        ? { description: this.form.description.trim() }
        : {}),
    };

    this.saving = true;
    this.cdr.detectChanges();

    const isEditing = !!this.editingProductId;

    const request = this.editingProductId
      ? this.productService.updateProduct(this.editingProductId, {
          code: payload.code,
          // Vacío = borrar el valor (el backend lo guarda como null).
          barcode: this.form.barcode.trim(),
          name: payload.name,
          description: this.form.description.trim(),
          categoryId: payload.categoryId,
          purchasePrice: payload.purchasePrice,
          salePrice: payload.salePrice,
          taxType: payload.taxType,
          taxRate: payload.taxRate,
          minimumStock: payload.minimumStock,
        })
      : this.productService.createProduct(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage = isEditing
          ? 'Producto actualizado correctamente.'
          : 'Producto creado correctamente.';
        this.editingProductId = null;
        this.cdr.detectChanges();
        this.loadProducts();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible guardar el producto.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleProductStatus(product: Product): void {
    if (!this.isAdmin) {
      return;
    }

    const action = product.isActive ? 'desactivar' : 'activar';

    if (!confirm(`¿Deseas ${action} el producto "${product.name}"?`)) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.productService
      .updateProduct(product.id, { isActive: !product.isActive })
      .subscribe({
        next: () => {
          this.successMessage = product.isActive
            ? 'Producto desactivado correctamente.'
            : 'Producto activado correctamente.';

          this.cdr.detectChanges();
          this.loadProducts();
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message ||
            'No fue posible cambiar el estado del producto.';
          this.cdr.detectChanges();
        },
      });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  private emptyForm() {
    return {
      code: '',
      barcode: '',
      name: '',
      description: '',
      categoryId: '',
      purchasePrice: 0,
      salePrice: 0,
      taxType: 'GENERAL',
      taxRate: 1900,
      stock: 0,
      minimumStock: 0,
    };
  }
}
