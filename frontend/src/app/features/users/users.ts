
import {
  Component,
  OnInit,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  User,
  UserService,
  CreateUserDto,
  UpdateUserDto,
} from '../../core/services/user.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './users.html',
  styleUrl: './users.scss',
})
export class Users implements OnInit {
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  users: User[] = [];

  loading = false;
  saving = false;
  showForm = false;
  editingId: string | null = null;

  errorMessage = '';
  successMessage = '';

  searchTerm = '';
  statusFilter: 'ALL' | 'ACTIVE' | 'INACTIVE' = 'ALL';

  form = this.emptyForm();

  ngOnInit(): void {
    this.loadUsers();
  }

  get filteredUsers(): User[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.users.filter((user) => {
      const matchesSearch =
        !search ||
        user.fullName.toLowerCase().includes(search) ||
        user.username.toLowerCase().includes(search);

      const matchesStatus =
        this.statusFilter === 'ALL' ||
        (this.statusFilter === 'ACTIVE' && user.isActive) ||
        (this.statusFilter === 'INACTIVE' && !user.isActive);

      return matchesSearch && matchesStatus;
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.userService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading = false;
        this.errorMessage =
          error.error?.message || 'No fue posible cargar los usuarios.';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = this.emptyForm();
    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
  }

  openEditForm(user: User): void {
    this.editingId = user.id;

    this.form = {
      fullName: user.fullName,
      username: user.username,
      password: '',
      role: user.role,
    };

    this.errorMessage = '';
    this.successMessage = '';
    this.showForm = true;
  }

  closeForm(): void {
    if (this.saving) {
      return;
    }

    this.showForm = false;
    this.editingId = null;
    this.form = this.emptyForm();
  }

  saveUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const fullName = this.form.fullName.trim();
    const username = this.form.username.trim().toLowerCase();
    const password = this.form.password;

    if (!fullName || !username) {
      this.errorMessage = 'Completa el nombre y el correo electrónico.';
      return;
    }

    if (!this.editingId && !password.trim()) {
      this.errorMessage = 'La contraseña es obligatoria para crear el usuario.';
      return;
    }

    if (password.trim() && password.length < 8) {
      this.errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }

    this.saving = true;

    if (this.editingId) {
      const data: UpdateUserDto = {
        fullName,
        username,
        role: this.form.role,
      };

      if (password.trim()) {
        data.password = password;
      }

      this.userService.updateUser(this.editingId, data).subscribe({
        next: () => {
          this.saving = false;
          this.showForm = false;
          this.successMessage = 'Usuario actualizado correctamente.';
          this.loadUsers();
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.saving = false;
          this.errorMessage =
            error.error?.message || 'No fue posible actualizar el usuario.';
          this.cdr.detectChanges();
        },
      });

      return;
    }

    const data: CreateUserDto = {
      fullName,
      username,
      password,
      role: this.form.role,
    };

    this.userService.createUser(data).subscribe({
      next: () => {
        this.saving = false;
        this.showForm = false;
        this.successMessage = 'Usuario creado correctamente.';
        this.loadUsers();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.saving = false;
        this.errorMessage =
          error.error?.message || 'No fue posible crear el usuario.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleStatus(user: User): void {
    this.errorMessage = '';
    this.successMessage = '';

    const data: UpdateUserDto = {
      isActive: !user.isActive,
    };

    this.userService.updateUser(user.id, data).subscribe({
      next: () => {
        this.successMessage = user.isActive
          ? 'Usuario desactivado correctamente.'
          : 'Usuario activado correctamente.';

        this.loadUsers();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage =
          error.error?.message || 'No fue posible cambiar el estado del usuario.';
        this.cdr.detectChanges();
      },
    });
  }

  private emptyForm() {
    return {
      fullName: '',
      username: '',
      password: '',
      role: 'OPERADOR' as 'ADMIN' | 'OPERADOR',
    };
  }
}
