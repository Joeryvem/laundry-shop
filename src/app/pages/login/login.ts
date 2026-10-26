
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  async submitLogin(): Promise<void> {
    this.errorMessage = '';

    if (!this.email.trim() || !this.password) {
      this.errorMessage = 'Please enter your email and password.';
      return;
    }

    this.loading = true;

    try {
      const { error } = await this.authService.signIn(
        this.email,
        this.password
      );

      if (error) {
        this.errorMessage = 'Invalid email or password.';
        return;
      }

      await this.router.navigateByUrl('/dashboard');
    } catch {
      this.errorMessage =
        'Unable to connect. Please check your internet connection.';
    } finally {
      this.loading = false;
    }
  }
}
