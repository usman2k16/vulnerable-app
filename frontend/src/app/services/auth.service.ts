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

  constructor(private http: HttpClient) {}

  login(username: string, password: string): Observable<{ user: User }> {
    return this.http
      .post<{ user: User }>(`${API}/login`, { username, password }, opts)
      .pipe(tap((res) => this.currentUser.set(res.user)));
  }

  logout(): Observable<{ success: boolean }> {
    return this.http
      .post<{ success: boolean }>(`${API}/logout`, {}, opts)
      .pipe(tap(() => this.currentUser.set(null)));
  }

  // Restores session state from the cookie on app start.
  loadCurrentUser(): Observable<{ user: User }> {
    return this.http
      .get<{ user: User }>(`${API}/me`, opts)
      .pipe(tap((res) => this.currentUser.set(res.user)));
  }
}
