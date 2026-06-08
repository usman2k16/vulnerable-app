import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { PostService } from '../services/post.service';
import { Post } from '../services/models';

@Component({
  selector: 'app-feed',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './feed.component.html',
  styleUrl: './feed.component.css'
})
export class FeedComponent implements OnInit {
  posts = signal<Post[]>([]);
  commentDrafts: Record<string, string> = {};

  constructor(public auth: AuthService, private postService: PostService) {}

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
