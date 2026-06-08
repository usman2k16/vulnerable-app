import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Post, Comment } from './models';

const API = 'http://localhost:3000';
const opts = { withCredentials: true };

@Injectable({ providedIn: 'root' })
export class PostService {
  constructor(private http: HttpClient) {}

  getPosts(): Observable<{ posts: Post[] }> {
    return this.http.get<{ posts: Post[] }>(`${API}/posts`, opts);
  }

  createPost(data: Partial<Post>): Observable<{ post: Post }> {
    return this.http.post<{ post: Post }>(`${API}/posts`, data, opts);
  }

  deletePost(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${API}/posts/${id}`, opts);
  }

  addComment(postId: string, content: string): Observable<{ comment: Comment }> {
    return this.http.post<{ comment: Comment }>(
      `${API}/posts/${postId}/comments`,
      { content },
      opts
    );
  }

  like(postId: string): Observable<{ success: boolean; likes: number }> {
    return this.http.post<{ success: boolean; likes: number }>(
      `${API}/posts/${postId}/like`,
      {},
      opts
    );
  }

  unlike(postId: string): Observable<{ success: boolean; likes: number }> {
    return this.http.post<{ success: boolean; likes: number }>(
      `${API}/posts/${postId}/unlike`,
      {},
      opts
    );
  }

  search(q: string): Observable<{ query: string; results: Post[] }> {
    return this.http.get<{ query: string; results: Post[] }>(`${API}/search`, {
      ...opts,
      params: { q },
    });
  }
}
