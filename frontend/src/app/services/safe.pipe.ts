import { Pipe, PipeTransform } from '@angular/core';
import {
  DomSanitizer,
  SafeHtml,
  SafeUrl,
  SafeStyle,
} from '@angular/platform-browser';

// VULNERABLE (Commit 2): this pipe is the "footgun".
//
// Angular escapes/sanitizes everything by default, which is exactly why the Phase 0
// baseline had no XSS. This pipe deliberately DISABLES that protection by calling
// DomSanitizer.bypassSecurityTrust*, telling Angular "trust this value, don't sanitize it".
// Feeding user-controlled data through it (as the feed/profile templates now do) is how a
// real Angular app gets XSS. Commit 3 removes these usages and restores the safe bindings.
@Pipe({ name: 'safe', standalone: true })
export class SafePipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string, type: 'html' | 'url' | 'style' = 'html'): SafeHtml | SafeUrl | SafeStyle {
    const v = value ?? '';
    switch (type) {
      case 'url':
        return this.sanitizer.bypassSecurityTrustUrl(v);
      case 'style':
        return this.sanitizer.bypassSecurityTrustStyle(v);
      case 'html':
      default:
        return this.sanitizer.bypassSecurityTrustHtml(v);
    }
  }
}
