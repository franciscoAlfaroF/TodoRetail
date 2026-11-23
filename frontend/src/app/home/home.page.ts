import { Component, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { ApiService, ProductResult, SavedProduct } from '../services/api.service';
import { AuthService, User } from '../services/auth.service';
import { Router } from '@angular/router';
import { distinctUntilChanged, Observable, of, Subscription, switchMap } from 'rxjs';
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
export class HomePage implements OnInit, OnDestroy {
  query: string = '';
  groupedProducts: GroupedProduct[] = [];
  originalGroups: GroupedProduct[] = [];
  loading: boolean = false;
  error: string | null = null;
  savedProductNotFound: boolean = false;
  savedProducts: SavedProduct[] = [];
  savedProductsError: string | null = null;
  showSavedProducts = false;
  sortOrder: string = 'asc'; // asc, desc, none

  currentUser$: Observable<User | null>;
  isAuthenticated$: Observable<boolean>;
  private searchTimer: ReturnType<typeof setTimeout> | undefined;
  private activeSearch: Subscription | undefined;
  private savedProductsSubscription: Subscription | undefined;

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

  ngOnInit() {
    this.savedProductsSubscription = this.isAuthenticated$
      .pipe(
        distinctUntilChanged(),
        switchMap((isAuthenticated) =>
          isAuthenticated ? this.apiService.getSavedProducts() : of([]),
        ),
      )
      .subscribe({
        next: (products) => {
          this.savedProducts = products;
          this.savedProductsError = null;
          this.cdr.detectChanges();
        },
        error: () => {
          this.savedProductsError = 'No se pudieron cargar tus productos guardados.';
          this.cdr.detectChanges();
        },
      });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

  logout() {
    this.authService.logout();
  }

  downloadMyData() {
    this.authService.exportAccount().subscribe({
      next: (data) => {
        const file = new Blob([JSON.stringify(data, null, 2)], {
          type: 'application/json',
        });
        const url = URL.createObjectURL(file);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'todoretail-datos-cuenta.json';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      },
      error: () => this.showPrivacyError('No se pudieron exportar los datos de la cuenta.'),
    });
  }

  async deleteMyAccount() {
    const confirmation = await this.alertCtrl.create({
      header: 'Eliminar cuenta',
      message: 'Se eliminarán tu cuenta y sus datos personales. Esta acción no se puede deshacer.',
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        { text: 'Eliminar cuenta', role: 'destructive' },
      ],
    });
    await confirmation.present();
    const { role } = await confirmation.onDidDismiss();
    if (role !== 'destructive') return;

    this.authService.deleteAccount().subscribe({
      next: () => this.router.navigate(['/home']),
      error: () =>
        this.showPrivacyError(
          'No se pudo eliminar la cuenta. Si eres el último administrador, primero asigna otro administrador.',
        ),
    });
  }

  private async showPrivacyError(message: string) {
    const alert = await this.alertCtrl.create({
      header: 'No se pudo completar la solicitud',
      message,
      buttons: ['OK'],
    });
    await alert.present();
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

  searchProducts(savedProductName?: string) {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.activeSearch?.unsubscribe();

    const query = this.query.trim();
    this.error = null;
    this.savedProductNotFound = false;
    this.groupedProducts = [];
    this.originalGroups = [];
    if (!query) {
      this.loading = false;
      this.cdr.detectChanges();
      return;
    }

    this.loading = true;
    this.cdr.detectChanges();

    this.searchTimer = setTimeout(() => {
      this.searchTimer = undefined;
      this.activeSearch = this.apiService.extractPrices(query).subscribe({
        next: (res) => {
          let groups = this.groupProducts(res.results);
          if (savedProductName) {
            const savedProductKey = this.createProductKey(savedProductName);
            groups = groups.filter((group) =>
              [group.name, ...group.prices.map((price) => price.original_name)].some(
                (name) => this.createProductKey(name) === savedProductKey,
              ),
            );
            this.savedProductNotFound = groups.length === 0;
          }
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
    }, 500);
  }

  ngOnDestroy() {
    if (this.searchTimer) {
      clearTimeout(this.searchTimer);
    }
    this.activeSearch?.unsubscribe();
    this.savedProductsSubscription?.unsubscribe();
  }

  isProductSaved(group: GroupedProduct): boolean {
    const key = this.createProductKey(group.name);
    return this.savedProducts.some((product) => this.createProductKey(product.name) === key);
  }

  saveProduct(group: GroupedProduct) {
    this.apiService.saveProduct(group.name).subscribe({
      next: (product) => {
        this.savedProducts = [
          product,
          ...this.savedProducts.filter((saved) => saved.id !== product.id),
        ];
        this.cdr.detectChanges();
      },
      error: () => {
        this.savedProductsError = 'No se pudo guardar el producto. Inténtalo nuevamente.';
        this.cdr.detectChanges();
      },
    });
  }

  removeSavedProduct(product: SavedProduct) {
    this.apiService.removeSavedProduct(product.id).subscribe({
      next: () => {
        this.savedProducts = this.savedProducts.filter((saved) => saved.id !== product.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.savedProductsError = 'No se pudo quitar el producto guardado.';
        this.cdr.detectChanges();
      },
    });
  }

  toggleSavedProduct(group: GroupedProduct) {
    const key = this.createProductKey(group.name);
    const savedProduct = this.savedProducts.find(
      (product) => this.createProductKey(product.name) === key,
    );
    if (savedProduct) {
      this.removeSavedProduct(savedProduct);
    } else {
      this.saveProduct(group);
    }
  }

  searchSavedProduct(product: SavedProduct) {
    this.showSavedProducts = false;
    this.query = product.name;
    this.searchProducts(product.name);
  }

  private createProductKey(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim()
      .replace(/\s+/g, ' ');
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
