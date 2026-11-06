
import {
  Component,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  CategoryService,
  Category,
  CreateCategoryDto,
} from '../../core/services/category.service';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-categories',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './categories.html',
  styleUrl: './categories.scss',
})
export class Categories implements OnInit {
  private readonly categoryService = inject(CategoryService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  categories: Category[] = [];

  searchTerm = '';
  statusFilter = 'ALL';

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  showForm = false;
  editingCategoryId: string | null = null;

  form = this.emptyForm();

  ngOnInit(): void {
    this.loadCategories();
  }

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  get filteredCategories(): Category[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.categories.filter((category) => {
      const matchesSearch =
        !search ||
        category.name.toLowerCase().includes(search) ||
        (category.description ?? '').toLowerCase().includes(search);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && category.isActive) ||
        (this.statusFilter === 'INACTIVE' && !category.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  loadCategories(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.categoryService.getCategories().subscribe({
      next: (categories) => {
        this.categories = categories;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible cargar las categorías.';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    this.editingCategoryId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEditForm(category: Category): void {
    this.editingCategoryId = category.id;

    this.form = {
      name: category.name,
      description: category.description ?? '',
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
    this.editingCategoryId = null;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  saveCategory(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.form.name.trim()) {
      this.errorMessage = 'Ingresa el nombre de la categoría.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateCategoryDto = {
      name: this.form.name.trim(),
      ...(this.form.description.trim()
        ? { description: this.form.description.trim() }
        : {}),
    };

    this.saving = true;
    this.cdr.detectChanges();

    const isEditing = !!this.editingCategoryId;

    const request = this.editingCategoryId
      ? this.categoryService.updateCategory(
          this.editingCategoryId,
          payload,
        )
      : this.categoryService.createCategory(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage = isEditing
          ? 'Categoría actualizada correctamente.'
          : 'Categoría creada correctamente.';
        this.editingCategoryId = null;
        this.cdr.detectChanges();
        this.loadCategories();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.error?.message ||
          'No fue posible guardar la categoría.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleCategoryStatus(category: Category): void {
    if (!this.isAdmin) {
      return;
    }

    const action = category.isActive ? 'desactivar' : 'activar';

    if (
      !confirm(
        `¿Deseas ${action} la categoría "${category.name}"?`,
      )
    ) {
      return;
    }

    this.errorMessage = '';
    this.successMessage = '';

    this.categoryService
      .updateCategory(category.id, {
        isActive: !category.isActive,
      })
      .subscribe({
        next: () => {
          this.successMessage = category.isActive
            ? 'Categoría desactivada correctamente.'
            : 'Categoría activada correctamente.';

          this.cdr.detectChanges();
          this.loadCategories();
        },
        error: (error) => {
          this.errorMessage =
            error.error?.message ||
            'No fue posible cambiar el estado de la categoría.';
          this.cdr.detectChanges();
        },
      });
  }

  formatDate(value?: string): string {
    if (!value) {
      return '—';
    }

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(value));
  }

  private emptyForm() {
    return {
      name: '',
      description: '',
    };
  }
}
