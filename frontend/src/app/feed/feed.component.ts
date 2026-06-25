import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { Post } from '../services/models';
import { SafePipe } from '../services/safe.pipe';
import { CopyHintComponent } from '../shared/copy-hint.component';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [FormsModule, SafePipe, CopyHintComponent],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.css'
})
export class FeedComponent implements OnInit {
  posts = signal<Post[]>([]);
  commentDrafts: Record<string, string> = {};

  // Commit 2 (XSS): copy-pasteable comment payload shown as a hint.
  readonly commentXss = `<img src=x onerror="alert('XSS in comment')">`;

  constructor(public auth: AuthService, private postService: PostService) {}

  // VULNERABLE (Commit 2): builds the <img> tag by string-concatenating the raw imageUrl/alt,
  // so a crafted `imageAlt` can break out of the attribute and add an event handler
  // (attribute-context XSS, vector 3). The result is injected via [innerHTML] in the template.
  rawImageTag(post: Post): string {
    return `<img class="post-img" src="${post.imageUrl}" alt="${post.imageAlt}">`;
  }

  ngOnInit() {
    this.load();
  }

  load() {
    this.postService.getPosts().subscribe((res) => this.posts.set(res.posts));
  }

  isLiked(post: Post): boolean {
    const u = this.auth.currentUser();
    return !!u && post.likes.includes(u.id);
  }

  isOwner(post: Post): boolean {
    const u = this.auth.currentUser();
    return !!u && post.createdBy === u.id;
  }

  toggleLike(post: Post) {
    const op = this.isLiked(post)
      ? this.postService.unlike(post.id)
      : this.postService.like(post.id);
    op.subscribe(() => this.load());
  }

  addComment(post: Post) {
    const content = (this.commentDrafts[post.id] || '').trim();
    if (!content) return;
    this.postService.addComment(post.id, content).subscribe(() => {
      this.commentDrafts[post.id] = '';
      this.load();
    });
  }

  deletePost(post: Post) {
    this.postService.deletePost(post.id).subscribe(() => this.load());
  }
}
