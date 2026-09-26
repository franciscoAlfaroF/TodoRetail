import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ProductResult {
  supermarket: string;
  name: string;
  price: number;
}

export interface ExtractResponse {
  status: string;
  results: ProductResult[];
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'http://localhost:3000/api'; 

  constructor(private http: HttpClient) { }

  extractPrices(query: string): Observable<ExtractResponse> {
    return this.http.post<ExtractResponse>(`${this.apiUrl}/extract`, { query });
  }
}
