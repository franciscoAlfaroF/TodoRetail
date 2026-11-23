import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular/lazy';
import { FormsModule } from '@angular/forms';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';

import { HomePage } from './home.page';
import { ApiService } from '../services/api.service';
import { AuthService } from '../services/auth.service';
import { of, Subject } from 'rxjs';

describe('HomePage', () => {
  let component: HomePage;
  let fixture: ComponentFixture<HomePage>;

  const mockApiService = {
    extractPrices: vi.fn().mockReturnValue(of({ status: 'ok', results: [] })),
    getFeaturedProducts: vi.fn().mockReturnValue(of({
      status: 'success',
      updatedAt: null,
      results: [],
    })),
    getSavedProducts: vi.fn().mockReturnValue(of([])),
    saveProduct: vi.fn(),
    removeSavedProduct: vi.fn(),
  };

  const mockAuthService = {
    currentUser$: of(null),
    isAuthenticated$: of(false),
    logout: vi.fn(),
    getAdminData: vi.fn().mockReturnValue(of({ message: 'ok' })),
  };

  beforeEach(async () => {
    mockApiService.extractPrices
      .mockReset()
      .mockReturnValue(of({ status: 'ok', results: [] }));
    mockApiService.getSavedProducts.mockReset().mockReturnValue(of([]));
    mockApiService.saveProduct.mockReset();
    mockApiService.removeSavedProduct.mockReset();

    await TestBed.configureTestingModule({
      declarations: [HomePage],
      imports: [
        IonicModule.forRoot(),
        FormsModule,
        HttpClientTestingModule,
        RouterTestingModule,
      ],
      providers: [
        { provide: ApiService, useValue: mockApiService },
        { provide: AuthService, useValue: mockAuthService },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(HomePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('saves a grouped product to the signed-in user list', () => {
    const savedProduct = {
      id: 17,
      name: 'Leche Entera 1 L',
      createdAt: '2026-11-22T00:00:00.000Z',
    };
    mockApiService.saveProduct.mockReturnValue(of(savedProduct));

    component.toggleSavedProduct({
      name: 'Leche Entera 1 L',
      prices: [],
      minPrice: 1000,
    });

    expect(mockApiService.saveProduct).toHaveBeenCalledWith('Leche Entera 1 L');
    expect(component.isProductSaved({
      name: 'Leche Entera 1 L',
      prices: [],
      minPrice: 1000,
    })).toBe(true);
  });

  it('shows only the exact saved product group when searching from saved products', () => {
    mockApiService.extractPrices.mockReturnValue(of({
      status: 'success',
      results: [
        {
          supermarket: 'Jumbo',
          name: 'Leche Entera 1 L',
          price: 1000,
          is_offer: false,
        },
        {
          supermarket: 'Santa Isabel',
          name: 'Leche Entera Colun 1 L',
          price: 1100,
          is_offer: false,
        },
        {
          supermarket: 'Unimarc',
          name: 'Leche Descremada 1 L',
          price: 900,
          is_offer: true,
        },
      ],
    }));

    vi.useFakeTimers();
    try {
      component.query = 'Leche Entera 1 L';
      component.searchProducts('Leche Entera 1 L');
      vi.advanceTimersByTime(500);

      expect(component.groupedProducts).toHaveLength(1);
      expect(component.groupedProducts[0].prices.map((price) => price.original_name)).toEqual([
        'Leche Entera 1 L',
        'Leche Entera Colun 1 L',
      ]);
      expect(component.savedProductNotFound).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not show similar products when the exact saved product is absent', () => {
    mockApiService.extractPrices.mockReturnValue(of({
      status: 'success',
      results: [
        {
          supermarket: 'Jumbo',
          name: 'Leche Entera Colun 1 L',
          price: 1100,
          is_offer: false,
        },
        {
          supermarket: 'Unimarc',
          name: 'Leche Descremada 1 L',
          price: 900,
          is_offer: true,
        },
      ],
    }));

    vi.useFakeTimers();
    try {
      component.query = 'Leche Entera 1 L';
      component.searchProducts('Leche Entera 1 L');
      vi.advanceTimersByTime(500);

      expect(component.groupedProducts).toEqual([]);
      expect(component.savedProductNotFound).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('measures grouping precision and recall on labeled product cases', () => {
    const labeledProducts = [
      { supermarket: 'Jumbo', name: 'Coca Cola Original 1.5 L', label: 'cola-original' },
      { supermarket: 'Unimarc', name: 'Coca-Cola Original 1,5L', label: 'cola-original' },
      { supermarket: 'Santa Isabel', name: 'Coca Cola Zero 1.5 L', label: 'cola-zero' },
      { supermarket: 'Jumbo', name: 'Leche Entera Colun 1 L', label: 'leche-colun-entera' },
      { supermarket: 'Unimarc', name: 'Leche Entera Colun 1L', label: 'leche-colun-entera' },
      { supermarket: 'Santa Isabel', name: 'Leche Entera Soprole 1 L', label: 'leche-soprole-entera' },
      { supermarket: 'Jumbo', name: 'Leche Descremada Colun 1 L', label: 'leche-colun-descremada' },
      { supermarket: 'Jumbo', name: 'Yogur Soprole Frutilla 125 g', label: 'yogur-frutilla' },
      { supermarket: 'Unimarc', name: 'Yogurt Soprole Frutilla 125gr', label: 'yogur-frutilla' },
      { supermarket: 'Santa Isabel', name: 'Yogur Soprole Vainilla 125 g', label: 'yogur-vainilla' },
      { supermarket: 'Jumbo', name: 'Aceite Chef Maravilla 1 L', label: 'aceite-chef' },
      { supermarket: 'Unimarc', name: 'Aceite Vegetal Chef Maravilla 1L', label: 'aceite-chef' },
    ];
    const keyOf = (product: { supermarket: string; name: string }) =>
      `${product.supermarket}:${product.name}`;
    const pairKey = (first: string, second: string) =>
      [first, second].sort().join('|');
    const expectedPairs = new Set<string>();

    for (let first = 0; first < labeledProducts.length; first++) {
      for (let second = first + 1; second < labeledProducts.length; second++) {
        if (labeledProducts[first].label === labeledProducts[second].label) {
          expectedPairs.add(
            pairKey(keyOf(labeledProducts[first]), keyOf(labeledProducts[second])),
          );
        }
      }
    }

    const groups = component.groupProducts(
      labeledProducts.map((product) => ({
        supermarket: product.supermarket,
        name: product.name,
        price: 1000,
      })),
    );
    const predictedPairs = new Set<string>();

    for (const group of groups) {
      for (let first = 0; first < group.prices.length; first++) {
        for (let second = first + 1; second < group.prices.length; second++) {
          predictedPairs.add(
            pairKey(
              keyOf({
                supermarket: group.prices[first].supermarket,
                name: group.prices[first].original_name,
              }),
              keyOf({
                supermarket: group.prices[second].supermarket,
                name: group.prices[second].original_name,
              }),
            ),
          );
        }
      }
    }

    const truePositives = [...predictedPairs].filter((pair) =>
      expectedPairs.has(pair),
    ).length;
    const falsePositives = predictedPairs.size - truePositives;
    const falseNegatives = expectedPairs.size - truePositives;
    const precision = truePositives / (truePositives + falsePositives);
    const recall = truePositives / (truePositives + falseNegatives);

    expect({
      inputProducts: labeledProducts.length,
      ungroupedCards: labeledProducts.length,
      groupedCards: groups.length,
      truePositives,
      falsePositives,
      falseNegatives,
      precision,
      recall,
    }).toEqual({
      inputProducts: 12,
      ungroupedCards: 12,
      groupedCards: 7,
      truePositives: 4,
      falsePositives: 2,
      falseNegatives: 0,
      precision: 2 / 3,
      recall: 1,
    });

    const milkGroup = groups.find((group) =>
      group.prices.some((price) => price.original_name.includes('Colun') &&
        price.original_name.includes('Entera')),
    );
    const colunMilk = keyOf({
      supermarket: 'Jumbo',
      name: 'Leche Entera Colun 1 L',
    });
    const soproleMilk = keyOf({
      supermarket: 'Santa Isabel',
      name: 'Leche Entera Soprole 1 L',
    });
    expect(milkGroup?.prices.map((price) => price.original_name)).toContain(
      'Leche Entera Soprole 1 L',
    );
    expect(predictedPairs.has(pairKey(colunMilk, soproleMilk))).toBe(true);
  });

  it('debounces searches and ignores responses from superseded queries', () => {
    const staleResponse = new Subject<{ status: string; results: [] }>();
    const currentResponse = new Subject<{ status: string; results: [] }>();
    mockApiService.extractPrices
      .mockReturnValueOnce(staleResponse)
      .mockReturnValueOnce(currentResponse);

    vi.useFakeTimers();
    try {
      component.query = 'crema';
      component.searchProducts();
      vi.advanceTimersByTime(500);
      expect(mockApiService.extractPrices).toHaveBeenCalledTimes(1);

      component.query = 'leche';
      component.searchProducts();
      vi.advanceTimersByTime(500);
      expect(mockApiService.extractPrices).toHaveBeenCalledTimes(2);

      staleResponse.error(new Error('Superseded query failed'));
      expect(component.error).toBeNull();

      currentResponse.next({ status: 'ok', results: [] });
      expect(component.error).toBeNull();
      expect(component.loading).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
