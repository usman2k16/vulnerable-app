import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../services/post.service';
import { CopyHintComponent } from '../shared/copy-hint.component';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [FormsModule, CopyHintComponent],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.css'
})
export class PostFormComponent {
  model = { title: '', content: '', imageUrl: '', imageAlt: '', linkUrl: '', color: '' };
  error = '';

  // Commit 2 (XSS): copy-pasteable payloads shown as hints under the inputs.
  readonly xss = {
    content: `<img src=x onerror="alert('XSS in post')">`,
    imageAlt: `" onerror="alert('XSS in attribute')`,
    linkUrl: `javascript:alert('XSS in URL')`,
    // The url() must point at a real image to be visibly painted; example.com returns HTML
    // (nothing to render). picsum serves an actual image, so the injected background shows.
    color: `red; background: url("https://picsum.photos/seed/xss/600/80")`,
  };

  constructor(private postService: PostService, private router: Router) {}

  submit() {
    this.error = '';
    this.postService.createPost(this.model).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: (err) => (this.error = err?.error?.error || 'Could not create post'),
    });
  }
}
