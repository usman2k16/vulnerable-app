import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { FeedComponent } from './feed/feed.component';
import { PostFormComponent } from './post-form/post-form.component';
import { ProfileComponent } from './profile/profile.component';
import { SearchComponent } from './search/search.component';
import { CspComponent } from './csp/csp.component';

export const routes: Routes = [
  { path: '', redirectTo: 'feed', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'feed', component: FeedComponent },
  { path: 'new', component: PostFormComponent },
  { path: 'profile', component: ProfileComponent },
  { path: 'search', component: SearchComponent },
  { path: 'csp', component: CspComponent },
  { path: '**', redirectTo: 'feed' },
];
