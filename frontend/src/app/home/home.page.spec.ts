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
