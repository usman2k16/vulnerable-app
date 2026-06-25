import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// Commit 5 (CSRF fix): attach the session's CSRF token to every state-changing request.
// Safe methods don't need it; login has no token yet (signal is null -> header omitted).
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const csrfInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).csrfToken();
  if (token && !SAFE_METHODS.includes(req.method)) {
    req = req.clone({ setHeaders: { 'X-CSRF-Token': token } });
  }
  return next(req);
};
