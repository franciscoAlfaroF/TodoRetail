import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ProductResult {
  supermarket: string;
  name: string;
  price: number;
  is_offer?: boolean;
  url?: string;
}

export interface ExtractResponse {
  status: string;
  results: ProductResult[];
}

export interface SavedProduct {
  id: number;
  name: string;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  extractPrices(query: string): Observable<ExtractResponse> {
    return this.http.post<ExtractResponse>(`${this.apiUrl}/extract`, { query });
  }

  getSavedProducts(): Observable<SavedProduct[]> {
    return this.http.get<SavedProduct[]>(`${this.apiUrl}/saved-products`);
  }

  saveProduct(name: string): Observable<SavedProduct> {
    return this.http.post<SavedProduct>(`${this.apiUrl}/saved-products`, { name });
  }

  removeSavedProduct(id: number): Observable<{ deleted: boolean }> {
    return this.http.delete<{ deleted: boolean }>(`${this.apiUrl}/saved-products/${id}`);
  }
}
