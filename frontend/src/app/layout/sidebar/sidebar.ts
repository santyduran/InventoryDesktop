
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { brandFullName, getAppConfig } from '../../core/config/app-config';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss',
})
export class Sidebar {
  readonly brand = getAppConfig().brand;
  readonly brandName = brandFullName();

  private readonly authService = inject(AuthService);

  get isAdmin(): boolean {
    return this.authService.getUser()?.role === 'ADMIN';
  }
}
