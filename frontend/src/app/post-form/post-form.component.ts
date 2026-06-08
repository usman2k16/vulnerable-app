import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { PostService } from '../services/post.service';

@Component({
  selector: 'app-post-form',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './post-form.component.html',
  styleUrl: './post-form.component.css'
})
export class PostFormComponent {
  model = { title: '', content: '', imageUrl: '', imageAlt: '', linkUrl: '', color: '' };
  error = '';

  constructor(private postService: PostService, private router: Router) {}

  submit() {
    this.error = '';
    this.postService.createPost(this.model).subscribe({
      next: () => this.router.navigate(['/feed']),
      error: (err) => (this.error = err?.error?.error || 'Could not create post'),
    });
  }
}
