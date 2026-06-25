import { Component, Input } from '@angular/core';

// A small reusable hint that shows a payload with a copy button, rendered under the relevant
// input. In Commit 3 the labels are reframed to "now escaped — verify it's inert"; the label
// carries its own leading icon, so none is hardcoded here.
@Component({
  selector: 'app-copy-hint',
  standalone: true,
  template: `
    <small class="xss-hint">
      {{ label }}
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
        color: #2e7d32;
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
