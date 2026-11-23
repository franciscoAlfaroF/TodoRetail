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
