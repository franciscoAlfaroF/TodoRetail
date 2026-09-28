import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService, ProductResult } from '../services/api.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  query: string = '';
  products: ProductResult[] = [];
  originalProducts: ProductResult[] = [];
  loading: boolean = false;
  error: string | null = null;
  sortOrder: string = 'asc'; // asc, desc, none

  constructor(private apiService: ApiService, private cdr: ChangeDetectorRef) {}

  searchProducts() {
    if (!this.query.trim()) return;
    
    this.loading = true;
    this.error = null;
    this.cdr.detectChanges();
    
    this.apiService.extractPrices(this.query).subscribe({
      next: (res) => {
        this.originalProducts = [...res.results];
        this.products = res.results;
        this.applySort(); // Default sorting
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Ocurrio un error consultando los precios.';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
      }
    });
  }

  applySort() {
    if (this.sortOrder === 'asc') {
      this.products.sort((a, b) => a.price - b.price);
    } else if (this.sortOrder === 'desc') {
      this.products.sort((a, b) => b.price - a.price);
    } else {
      this.products = [...this.originalProducts];
    }
  }
}
