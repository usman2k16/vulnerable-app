import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PostService } from '../services/post.service';
import { Post } from '../services/models';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent {
  q = '';
  results: Post[] = [];
  searched = false;

  constructor(private postService: PostService) {}

  search() {
    this.postService.search(this.q).subscribe((res) => {
      this.results = res.results;
      this.searched = true;
    });
  }
}
