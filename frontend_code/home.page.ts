import { Component } from '@angular/core';
import { ApiService, ProductResult } from '../services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  query: string = '';
  products: ProductResult[] = [];
  loading: boolean = false;
  error: string | null = null;

  constructor(private apiService: ApiService) {}

  searchProducts() {
    if (!this.query.trim()) return;
    
    this.loading = true;
    this.error = null;
    
    this.apiService.extractPrices(this.query).subscribe({
      next: (res) => {
        this.products = res.results;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Ocurrió un error consultando los precios.';
        this.loading = false;
        console.error(err);
      }
    });
  }
}
