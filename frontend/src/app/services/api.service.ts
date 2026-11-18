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

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  extractPrices(query: string): Observable<ExtractResponse> {
    return this.http.post<ExtractResponse>(`${this.apiUrl}/extract`, { query });
  }
}
