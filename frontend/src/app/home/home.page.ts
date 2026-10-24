import { Component, ChangeDetectorRef } from '@angular/core';
import { ApiService, ProductResult } from '../services/api.service';
import { AuthService, User } from '../services/auth.service';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AlertController } from '@ionic/angular/lazy';

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

  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;

  constructor(
    private apiService: ApiService,
    public authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private alertCtrl: AlertController,
  ) {
    this.currentUser$ = this.authService.currentUser$;
    this.isAuthenticated$ = this.authService.isAuthenticated$;
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logout();
  }

  async testAdminAccess() {
    this.authService.getAdminData().subscribe({
      next: async (res) => {
        const alert = await this.alertCtrl.create({
          header: 'Autorización Exitosa (RBAC)',
          subHeader: 'Endpoint Protegido para Administradores',
          message: `${res.message} (Usuario: ${res.user.email})`,
          buttons: ['OK'],
        });
        await alert.present();
      },
      error: async (err) => {
        const alert = await this.alertCtrl.create({
          header: 'Acceso Denegado (RBAC)',
          subHeader: 'Código: 403 Forbidden',
          message: err.error?.message || 'No tienes permisos de Administrador para acceder a este recurso.',
          buttons: ['OK'],
        });
        await alert.present();
      },
    });
  }

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
        this.error = 'Ocurrió un error consultando los precios.';
        this.loading = false;
        this.cdr.detectChanges();
        console.error(err);
      },
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

      const stopWords = [
        'de', 'la', 'el', 'en', 'para', 'y', 'con', 'sin', 'un', 'una',
        'pack', 'formato', 'familiar', 'desechable', 'retornable',
        'botella', 'lata', 'bolsa', 'caja', 'unidades', 'unid', 'un.'
      ];

      return lower
        .replace(/[^a-z0-9áéíóúüñ\s]/gi, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 0 && !stopWords.includes(w));
    };

    const strictVariants = [
      'zero', 'light', 'original', 'vainilla', 'chocolate', 'frutilla',
      'naranja', 'limon', 'frambuesa', 'manzana', 'cola', 'diet',
      'descremada', 'semidescremada', 'entera', 'sin lactosa', 'clasica',
      'regular', 'negra', 'blanca'
    ];

    const getVariants = (lowerName: string) => {
      return strictVariants.filter((v) => lowerName.includes(v));
    };

    const items = results.map((p) => {
      const lower = p.name.toLowerCase().replace(/\bcc\b/g, 'ml');
      return {
        product: p,
        tokens: normalize(p.name),
        variants: getVariants(lower),
      };
    });

    for (const item of items) {
      let matchedGroup: GroupedProduct | null = null;
      let highestSimilarity = 0;

      for (const group of groups) {
        const groupTokens = normalize(group.name);
        const groupVariants = getVariants(group.name.toLowerCase().replace(/\bcc\b/g, 'ml'));

        const variantsMatch =
          item.variants.length === groupVariants.length &&
          item.variants.every((v) => groupVariants.includes(v));

        if (!variantsMatch) {
          continue;
        }

        const intersection = item.tokens.filter((t) => groupTokens.includes(t));
        const union = new Set([...item.tokens, ...groupTokens]);
        const similarity = intersection.length / union.size;

        if (similarity > 0.45 && similarity > highestSimilarity) {
          highestSimilarity = similarity;
          matchedGroup = group;
        }
      }

      if (matchedGroup) {
        const existingSupermarketPrice = matchedGroup.prices.find(
          (p) => p.supermarket === item.product.supermarket,
        );
        if (existingSupermarketPrice) {
          if (item.product.price < existingSupermarketPrice.price) {
            existingSupermarketPrice.price = item.product.price;
            existingSupermarketPrice.is_offer = item.product.is_offer || false;
            existingSupermarketPrice.url = item.product.url;
            existingSupermarketPrice.original_name = item.product.name;
          }
        } else {
          matchedGroup.prices.push({
            supermarket: item.product.supermarket,
            price: item.product.price,
            is_offer: item.product.is_offer || false,
            url: item.product.url,
            original_name: item.product.name,
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
          prices: [
            {
              supermarket: item.product.supermarket,
              price: item.product.price,
              is_offer: item.product.is_offer || false,
              url: item.product.url,
              original_name: item.product.name,
            },
          ],
          minPrice: item.product.price,
        });
      }
    }

    for (const group of groups) {
      group.prices.sort((a, b) => a.price - b.price);
      group.uniqueSupermarkets = new Set(group.prices.map((p) => p.supermarket)).size;
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
