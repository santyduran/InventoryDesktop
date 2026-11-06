
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Provider {
  id: string;
  businessName: string;
  nit: string;
  verificationDigit?: string | null;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  bankAccount?: string | null;
  observations?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  _count?: {
    purchaseInvoices: number;
  };
}

export interface CreateProviderDto {
  businessName: string;
  nit: string;
  verificationDigit?: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  bankAccount?: string;
  observations?: string;
}

export type UpdateProviderDto = Partial<CreateProviderDto> & {
  isActive?: boolean;
};

@Injectable({
  providedIn: 'root',
})
export class ProviderService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:3000/providers';

  getProviders(): Observable<Provider[]> {
    return this.http.get<Provider[]>(this.apiUrl);
  }

  getProvider(id: string): Observable<Provider> {
    return this.http.get<Provider>(`${this.apiUrl}/${id}`);
  }

  createProvider(data: CreateProviderDto): Observable<Provider> {
    return this.http.post<Provider>(this.apiUrl, data);
  }

  updateProvider(
    id: string,
    data: UpdateProviderDto,
  ): Observable<Provider> {
    return this.http.patch<Provider>(`${this.apiUrl}/${id}`, data);
  }
}
