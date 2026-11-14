
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { getAppConfig } from '../config/app-config';

export interface ProductCategory {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Product {
  id: string;
  code: string;
  barcode?: string | null;
  name: string;
  description?: string | null;
  categoryId: string;
  category?: ProductCategory;
  purchasePrice: number;
  salePrice: number;
  taxType: string;
  taxRate: number;
  stock: number;
  minimumStock: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductDto {
  code: string;
  barcode?: string;
  name: string;
  description?: string;
  categoryId: string;
  purchasePrice: number;
  salePrice: number;
  taxType: string;
  taxRate: number;
  stock: number;
  minimumStock: number;
}

export type UpdateProductDto = Partial<CreateProductDto> & {
  isActive?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = getAppConfig().apiUrl;

  getProducts(): Observable<Product[]> {
    return this.http.get<Product[]>(`${this.apiUrl}/products`);
  }

  getProduct(id: string): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  getCategories(): Observable<ProductCategory[]> {
    return this.http.get<ProductCategory[]>(`${this.apiUrl}/categories`);
  }

  createProduct(data: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, data);
  }

  updateProduct(
    id: string,
    data: UpdateProductDto,
  ): Observable<Product> {
    return this.http.patch<Product>(
      `${this.apiUrl}/products/${id}`,
      data,
    );
  }
}
