import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PostService } from '../services/post.service';
import { Post } from '../services/models';
import { SafePipe } from '../services/safe.pipe';
import { CopyHintComponent } from '../shared/copy-hint.component';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [FormsModule, SafePipe, CopyHintComponent],
  templateUrl: './search.component.html',
  styleUrl: './search.component.css'
})
export class SearchComponent implements OnInit {
  q = '';
  resultQuery = ''; // raw query echoed by the server (VULNERABLE: rendered via innerHTML)
  results: Post[] = [];
  searched = false;

  // Commit 2 (reflected XSS): delivered via a crafted /search?q= link.
  readonly reflectedXss = `<img src=x onerror="alert('Reflected XSS')">`;

  constructor(
    private postService: PostService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Reading `q` from the URL is what makes this reflected: a victim opens a crafted link
    // and the query is echoed straight back into the page.
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q');
      if (q !== null) {
        this.q = q;
        this.runSearch(q);
      }
    });
  }

  // Put the typed query into the URL so it's shareable / reflected, then ngOnInit's
  // subscription performs the actual search.
  submit() {
    this.router.navigate([], { queryParams: { q: this.q } });
  }

  private runSearch(q: string) {
    this.postService.search(q).subscribe((res) => {
      this.resultQuery = res.query; // server echoes raw -> reflected
      this.results = res.results;
      this.searched = true;
    });
  }
}
