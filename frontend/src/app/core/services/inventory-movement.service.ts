
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface InventoryMovement {
  id: string;
  productId: string;
  userId: string;
  movementType: 'ENTRY' | 'EXIT';
  quantity: number;
  stockBefore: number;
  stockAfter: number;
  referenceType?: string | null;
  referenceId?: string | null;
  observations?: string | null;
  createdAt: string;
  product?: {
    id: string;
    code: string;
    name: string;
  };
  user?: {
    id: string;
    fullName: string;
    username: string;
  };
}

export interface CreateInventoryMovementDto {
  productId: string;
  movementType: 'ENTRY' | 'EXIT';
  quantity: number;
  observations?: string;
}

@Injectable({
  providedIn: 'root',
})
export class InventoryMovementService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:3000/inventory/movements';

  getMovements(): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(this.apiUrl);
  }

  getProductMovements(
    productId: string,
  ): Observable<InventoryMovement[]> {
    return this.http.get<InventoryMovement[]>(
      `${this.apiUrl}/product/${productId}`,
    );
  }

  createMovement(
    data: CreateInventoryMovementDto,
  ): Observable<InventoryMovement> {
    return this.http.post<InventoryMovement>(this.apiUrl, data);
  }
}
