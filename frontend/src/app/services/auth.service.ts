import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface User {
  id: number;
  email: string;
  name?: string;
  role: 'USER' | 'ADMIN';
  createdAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface AccountExport {
  exportedAt: string;
  account: User & { updatedAt: string };
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/auth`;
  private readonly LEGACY_TOKEN_KEY = 'todoretail_token';

  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.LEGACY_TOKEN_KEY);
    }
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  public get isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  register(payload: {
    email: string;
    password: string;
    name?: string;
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/register`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res)),
    );
  }

  login(payload: { email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/login`, payload).pipe(
      tap((res) => this.handleAuthSuccess(res)),
    );
  }

  getProfile(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
      tap((user) => {
        this.currentUserSubject.next(user);
        this.isAuthenticatedSubject.next(true);
      }),
    );
  }

  restoreSession(): void {
    this.getProfile().subscribe({
      error: (error: { status?: number }) => {
        if (error.status !== 401) {
          console.error(`Session restoration failed with HTTP ${error.status ?? 'unknown'}.`);
        }
      },
    });
  }

  getAdminData(): Observable<{ message: string; user: any }> {
    return this.http.get<{ message: string; user: any }>(`${this.apiUrl}/admin`);
  }

  exportAccount(): Observable<AccountExport> {
    return this.http.get<AccountExport>(`${this.apiUrl}/account/export`);
  }

  deleteAccount(): Observable<{ id: number }> {
    return this.http.delete<{ id: number }>(`${this.apiUrl}/account`).pipe(
      tap(() => this.clearLocalSession()),
    );
  }

  logout(): void {
    this.clearLocalSession();
    this.http.post<void>(`${this.apiUrl}/logout`, {}).subscribe({
      error: () => console.warn('Logout request failed; the server session will expire.'),
    });
    this.router.navigate(['/login']);
  }

  clearLocalSession(): void {
    this.currentUserSubject.next(null);
    this.isAuthenticatedSubject.next(false);
  }

  private handleAuthSuccess(res: AuthResponse): void {
    if (res.user) {
      this.currentUserSubject.next(res.user);
    }
    this.isAuthenticatedSubject.next(true);
  }
}
