
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  Provider,
  ProviderService,
  CreateProviderDto,
  UpdateProviderDto,
} from '../../core/services/provider.service';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-providers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './providers.html',
  styleUrl: './providers.scss',
})
export class Providers implements OnInit {
  private readonly providerService = inject(ProviderService);
  private readonly authService = inject(AuthService);
  private readonly cdr = inject(ChangeDetectorRef);

  providers: Provider[] = [];
  searchTerm = '';
  statusFilter = 'ALL';

  loading = false;
  saving = false;

  errorMessage = '';
  successMessage = '';

  showForm = false;
  editingProviderId: string | null = null;

  form = this.emptyForm();

  ngOnInit(): void {
    this.loadProviders();
  }

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }

  get filteredProviders(): Provider[] {
    const term = this.searchTerm.trim().toLowerCase();

    return this.providers.filter((provider) => {
      const matchesSearch =
        !term ||
        provider.businessName.toLowerCase().includes(term) ||
        provider.nit.toLowerCase().includes(term) ||
        (provider.contactName ?? '').toLowerCase().includes(term) ||
        (provider.phone ?? '').toLowerCase().includes(term);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && provider.isActive) ||
        (this.statusFilter === 'INACTIVE' && !provider.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  loadProviders(): void {
    this.loading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.providerService.getProviders().subscribe({
      next: (data) => {
        this.providers = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'No fue posible cargar los proveedores.';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    this.editingProviderId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  openEditForm(provider: Provider): void {
    this.editingProviderId = provider.id;

    this.form = {
      businessName: provider.businessName,
      nit: provider.nit,
      verificationDigit: provider.verificationDigit ?? '',
      contactName: provider.contactName ?? '',
      phone: provider.phone ?? '',
      email: provider.email ?? '',
      address: provider.address ?? '',
      city: provider.city ?? '',
      state: provider.state ?? '',
      bankAccount: provider.bankAccount ?? '',
      observations: provider.observations ?? '',
    };

    this.errorMessage = '';
    this.showForm = true;
    this.cdr.detectChanges();
  }

  closeForm(): void {
    if (this.saving) return;

    this.showForm = false;
    this.editingProviderId = null;
    this.form = this.emptyForm();
    this.cdr.detectChanges();
  }

  saveProvider(): void {
    if (!this.form.businessName.trim() || !this.form.nit.trim()) {
      this.errorMessage = 'La razón social y el NIT son obligatorios.';
      this.cdr.detectChanges();
      return;
    }

    const payload: CreateProviderDto = {
      businessName: this.form.businessName.trim(),
      nit: this.form.nit.trim(),
      verificationDigit: this.form.verificationDigit.trim() || undefined,
      contactName: this.form.contactName.trim() || undefined,
      phone: this.form.phone.trim() || undefined,
      email: this.form.email.trim() || undefined,
      address: this.form.address.trim() || undefined,
      city: this.form.city.trim() || undefined,
      state: this.form.state.trim() || undefined,
      bankAccount: this.form.bankAccount.trim() || undefined,
      observations: this.form.observations.trim() || undefined,
    };

    this.saving = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    const request = this.editingProviderId
      ? this.providerService.updateProvider(
          this.editingProviderId,
          payload as UpdateProviderDto,
        )
      : this.providerService.createProvider(payload);

    request.subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage = this.editingProviderId
          ? 'Proveedor actualizado correctamente.'
          : 'Proveedor registrado correctamente.';

        this.editingProviderId = null;
        this.form = this.emptyForm();
        this.cdr.detectChanges();
        this.loadProviders();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.error?.message || 'No fue posible guardar el proveedor.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleProviderStatus(provider: Provider): void {
    const action = provider.isActive ? 'desactivar' : 'activar';

    if (!confirm(`¿Estás seguro de ${action} este proveedor?`)) {
      return;
    }

    const payload: UpdateProviderDto = {
      isActive: !provider.isActive,
    };

    this.providerService.updateProvider(provider.id, payload).subscribe({
      next: () => {
        this.successMessage = provider.isActive
          ? 'Proveedor desactivado correctamente.'
          : 'Proveedor activado correctamente.';

        this.cdr.detectChanges();
        this.loadProviders();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No fue posible cambiar el estado.';
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(date?: string): string {
    if (!date) return '—';

    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(date));
  }

  private emptyForm() {
    return {
      businessName: '',
      nit: '',
      verificationDigit: '',
      contactName: '',
      phone: '',
      email: '',
      address: '',
      city: '',
      state: '',
      bankAccount: '',
      observations: '',
    };
  }
}
