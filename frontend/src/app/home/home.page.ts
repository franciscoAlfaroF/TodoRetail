import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService, ProductResult } from '../services/api.service';

export interface SupermarketPrice {
  supermarket: string;
  price: number;
  is_offer: boolean;
  url?: string;
}

export interface GroupedProduct {
  name: string;
  prices: SupermarketPrice[];
  minPrice: number;
}

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  query: string = '';
  groupedProducts: GroupedProduct[] = [];
  originalGroups: GroupedProduct[] = [];
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
        const groups = this.groupProducts(res.results);
        this.originalGroups = [...groups];
        this.groupedProducts = groups;
        this.applySort();
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

  groupProducts(results: ProductResult[]): GroupedProduct[] {
    const map = new Map<string, GroupedProduct>();
    
    for (const p of results) {
      // Normalizamos el nombre para agrupar mejor (ej. quitando mayusculas y espacios dobles)
      const key = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
      
      if (!map.has(key)) {
        map.set(key, {
          name: p.name, 
          prices: [],
          minPrice: p.price
        });
      }
      
      const group = map.get(key)!;
      group.prices.push({
        supermarket: p.supermarket,
        price: p.price,
        is_offer: p.is_offer || false,
        url: p.url
      });
      
      if (p.price < group.minPrice) {
        group.minPrice = p.price;
      }
    }
    
    // Ordenamos los precios dentro de cada grupo (menor a mayor)
    for (const group of map.values()) {
      group.prices.sort((a, b) => a.price - b.price);
    }
    
    return Array.from(map.values());
  }

  applySort() {
    if (this.sortOrder === 'asc') {
      this.groupedProducts.sort((a, b) => a.minPrice - b.minPrice);
    } else if (this.sortOrder === 'desc') {
      this.groupedProducts.sort((a, b) => b.minPrice - a.minPrice);
    } else {
      this.groupedProducts = [...this.originalGroups];
    }
  }
}
