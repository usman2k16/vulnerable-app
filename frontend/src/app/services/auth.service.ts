import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { User } from './models';

const API = 'http://localhost:3000';
// withCredentials sends/receives the session cookie cross-origin (4200 -> 3000).
const opts = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<User | null>(null);
  // Commit 5 (CSRF fix): per-session token the csrfInterceptor echoes as X-CSRF-Token.
  readonly csrfToken = signal<string | null>(null);

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ user: User; csrfToken: string }> {
    return this.http
      .post<{ user: User; csrfToken: string }>(`${API}/login`, { username, password }, opts)
      .pipe(tap((res) => {
        this.currentUser.set(res.user);
        this.csrfToken.set(res.csrfToken);
      }));
  }

  logout(): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(`${API}/logout`, {}, opts)
      .pipe(tap(() => {
        this.currentUser.set(null);
        this.csrfToken.set(null);
      }));
  }

  // Restores session state + CSRF token from the cookie on app start.
  loadCurrentUser(): Observable<{ user: User; csrfToken: string }> {
    return this.http
      .get<{ user: User; csrfToken: string }>(`${API}/me`, opts)
      .pipe(tap((res) => {
        this.currentUser.set(res.user);
        this.csrfToken.set(res.csrfToken);
      }));
  }
}
