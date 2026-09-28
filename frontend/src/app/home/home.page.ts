import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService, ProductResult } from '../services/api.service';

export interface SupermarketPrice {
  supermarket: string;
  price: number;
  is_offer: boolean;
  url?: string;
  original_name: string;
}

export interface GroupedProduct {
  name: string;
  prices: SupermarketPrice[];
  minPrice: number;
  uniqueSupermarkets?: number;
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
    const groups: GroupedProduct[] = [];

    const normalize = (name: string) => {
      let lower = name.toLowerCase();
      // Estandarizar unidades
      lower = lower.replace(/\bcc\b/g, 'ml');
      lower = lower.replace(/\bgr\b/g, 'g');
      lower = lower.replace(/\blts?\b/g, 'l');
      // Unir números con unidades (ej "1.25 l" -> "1.25l")
      lower = lower.replace(/(\d+(?:[.,]\d+)?)\s*(ml|l|g|kg)\b/g, '$1$2');
      // Eliminar palabras basura
      const filler = ['desechable', 'retornable', 'botella', 'lata', 'envase', 'pack', 'display', 'pote', 'bolsa'];
      for (const w of filler) {
        lower = lower.replace(new RegExp(`\\b${w}\\b`, 'g'), ' ');
      }
      
      const volumeMatch = lower.match(/(\d+(?:[.,]\d+)?)(ml|l|g|kg)/);
      const volume = volumeMatch ? volumeMatch[0] : null;
      
      let clean = lower;
      if (volume) clean = clean.replace(volume, ' ');
      
      const words = Array.from(new Set(clean.match(/[a-z0-9ñ]+/g) || []));
      return { volume, words, original: name };
    };

    const isMatch = (n1: ReturnType<typeof normalize>, n2: ReturnType<typeof normalize>) => {
      if (n1.volume && n2.volume && n1.volume !== n2.volume) return false;
      
      // Reglas estrictas: Palabras que cambian drásticamente el producto.
      // Si un producto la tiene, el otro está OBLIGADO a tenerla para agruparse.
      const strictVariants = [
        // Salud / Dieta
        'zero', 'light', 'diet', 'sin azúcar', 'sin azucar', 'sin lactosa', 'vegan', 'vegano',
        // Leches
        'descremada', 'entera', 'semidescremada',
        // Empaque / Cantidad
        'pack', 'caja', 'display', 'tripack',
        // Sabores / Ingredientes (El problema de las Tritón)
        'vainilla', 'chocolate', 'cacao', 'naranja', 'frutilla', 'fresa', 'limón', 'limon', 
        'manzana', 'piña', 'durazno', 'frambuesa', 'mora', 'caramelo', 'menta', 'almendra', 
        'maní', 'mani', 'queso', 'jamón', 'jamon', 'pollo', 'carne'
      ];
      
      const o1 = n1.original.toLowerCase();
      const o2 = n2.original.toLowerCase();
      
      for (const v of strictVariants) {
        const has1 = o1.includes(v);
        const has2 = o2.includes(v);
        if (has1 !== has2) return false;
      }
      
      let intersection = 0;
      for (const w of n1.words) {
        if (n2.words.includes(w)) intersection++;
      }
      
      const minLength = Math.min(n1.words.length, n2.words.length);
      const maxLength = Math.max(n1.words.length, n2.words.length);
      if (minLength === 0) return false;
      
      // Exigir al menos 60% de similitud respecto al nombre más largo, 
      // o 100% respecto al más corto.
      const matchMin = intersection / minLength;
      const matchMax = intersection / maxLength;
      
      return matchMin >= 0.8 && matchMax >= 0.5;
    };

    const normalizedResults = results.map(p => ({
      product: p,
      norm: normalize(p.name)
    }));

    for (const item of normalizedResults) {
      // Buscar si encaja en un grupo existente
      let matchedGroup = groups.find(g => isMatch(normalize(g.name), item.norm));
      
      if (matchedGroup) {
        // Permitimos precios diferentes del mismo supermercado, pero evitamos el duplicado exacto
        const exists = matchedGroup.prices.find(p => p.supermarket === item.product.supermarket && p.price === item.product.price && p.original_name === item.product.name);
        if (!exists) {
          matchedGroup.prices.push({
            supermarket: item.product.supermarket,
            price: item.product.price,
            is_offer: item.product.is_offer || false,
            url: item.product.url,
            original_name: item.product.name
          });
          if (item.product.price < matchedGroup.minPrice) {
            matchedGroup.minPrice = item.product.price;
          }
          if (item.product.name.length < matchedGroup.name.length) {
            matchedGroup.name = item.product.name;
          }
        }
      } else {
        groups.push({
          name: item.product.name,
          prices: [{
            supermarket: item.product.supermarket,
            price: item.product.price,
            is_offer: item.product.is_offer || false,
            url: item.product.url,
            original_name: item.product.name
          }],
          minPrice: item.product.price
        });
      }
    }
    
    for (const group of groups) {
      group.prices.sort((a, b) => a.price - b.price);
      group.uniqueSupermarkets = new Set(group.prices.map(p => p.supermarket)).size;
    }
    
    return groups;
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
