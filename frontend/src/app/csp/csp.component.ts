import { Component, OnDestroy, OnInit, signal } from '@angular/core';

interface Attempt {
  label: string;
  outcome: string;
  ok: boolean; // true = the action was allowed to run, false = blocked
}
interface Violation {
  directive: string;
  blockedUri: string;
}

// Commit 6 (CSP): an interactive playground. The page's policy comes from the <meta> in
// index.html (document-level, fixed at load). These buttons attempt risky actions; under the
// strict policy the browser blocks them and fires `securitypolicyviolation`, which we log live.
@Component({
  selector: 'app-csp',
  standalone: true,
  templateUrl: './csp.component.html',
  styleUrl: './csp.component.css',
})
export class CspComponent implements OnInit, OnDestroy {
  policy = signal<string>('(no CSP meta found on this page)');
  results = signal<Attempt[]>([]);
  violations = signal<Violation[]>([]);

  private readonly onViolation = (e: SecurityPolicyViolationEvent) => {
    this.violations.update((v) => [
      { directive: e.violatedDirective, blockedUri: e.blockedURI || '(inline)' },
      ...v,
    ]);
  };

  ngOnInit() {
    const meta = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    if (meta) this.policy.set(meta.getAttribute('content') || '');
    document.addEventListener('securitypolicyviolation', this.onViolation);
  }

  ngOnDestroy() {
    document.removeEventListener('securitypolicyviolation', this.onViolation);
  }

  private add(label: string, outcome: string, ok: boolean) {
    this.results.update((r) => [{ label, outcome, ok }, ...r]);
  }

  tryInlineScript() {
    (window as any).__cspRan = false;
    const s = document.createElement('script');
    s.textContent = 'window.__cspRan = true;';
    document.body.appendChild(s);
    document.body.removeChild(s);
    const ran = (window as any).__cspRan === true;
    this.add(
      'inline <script>',
      ran ? 'executed (CSP allowed inline)' : "blocked — script-src lacks 'unsafe-inline'",
      ran
    );
  }

  tryExternalScript() {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1/dist/confetti.browser.min.js';
    s.onload = () => this.add('cross-origin <script>', 'loaded (host was allowed)', true);
    s.onerror = () => this.add('cross-origin <script>', "blocked — script-src is 'self' only", false);
    document.body.appendChild(s);
  }

  tryImage() {
    const img = new Image();
    img.onload = () => this.add('non-https image', 'loaded (CSP allowed it)', true);
    img.onerror = () => this.add('non-https image', 'blocked — img-src has no http:', false);
    img.src = 'http://neverssl.com/favicon.ico?t=' + Date.now();
  }

  async tryFetch() {
    try {
      await fetch('https://example.com', { mode: 'no-cors' });
      this.add('fetch other origin', 'request sent (connect-src allowed it)', true);
    } catch (e: any) {
      this.add('fetch other origin', `blocked — connect-src (${e.name})`, false);
    }
  }

  clear() {
    this.results.set([]);
    this.violations.set([]);
  }
}
