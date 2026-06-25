import { Component, Input } from '@angular/core';

// Commit 2 (XSS): a small reusable hint that shows an attack payload with a copy button.
// Rendered under the relevant inputs so the payload can be pasted where it's used.
// Removed / flipped to "now escaped" in Commit 3.
@Component({
  selector: 'app-copy-hint',
  standalone: true,
  template: `
    <small class="xss-hint">
      💉 {{ label }}
      <code>{{ payload }}</code>
      <button
        type="button"
        class="copy-btn"
        (click)="copy()"
        [attr.aria-label]="'Copy payload to clipboard'"
        [title]="copied ? 'Copied!' : 'Copy'"
      >{{ copied ? '✓ copied' : '📋' }}</button>
    </small>
  `,
  styles: [
    `
      .copy-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0 0.3rem;
        font-size: 0.8rem;
        line-height: 1;
        color: #b04632;
      }
      .copy-btn:hover {
        text-decoration: underline;
      }
    `,
  ],
})
export class CopyHintComponent {
  @Input() label = '';
  @Input() payload = '';
  copied = false;

  copy() {
    // localhost is a secure context, so the async Clipboard API is available.
    navigator.clipboard?.writeText(this.payload);
    this.copied = true;
    setTimeout(() => (this.copied = false), 1200);
  }
}
