import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from './models';

const API = 'http://localhost:3000';
const opts = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class UserService {
  constructor(private http: HttpClient) {}

  getUser(id: string): Observable<{ user: User }> {
    return this.http.get<{ user: User }>(`${API}/api/users/${id}`, opts);
  }

  updateProfile(data: { bio?: string; email?: string }): Observable<{ user: User }> {
    return this.http.post<{ user: User }>(`${API}/profile/update`, data, opts);
  }
}
