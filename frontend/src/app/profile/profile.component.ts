import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {
  bio = '';
  email = '';
  saved = false;

  constructor(public auth: AuthService, private userService: UserService) {}

  ngOnInit() {
    const u = this.auth.currentUser();
    if (u) {
      this.bio = u.bio;
      this.email = u.email;
    }
  }

  save() {
    this.saved = false;
    this.userService.updateProfile({ bio: this.bio, email: this.email }).subscribe((res) => {
      this.auth.currentUser.set(res.user);
      this.saved = true;
    });
  }
}
