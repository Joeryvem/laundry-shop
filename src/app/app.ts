
import { Component } from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  readonly navigation = [
    { label: 'Dashboard', path: '/dashboard', icon: '▦' },
    { label: 'New Order', path: '/new-order', icon: '+' },
    { label: 'Active Orders', path: '/active-orders', icon: '♧' },
    { label: 'Reservations', path: '/reservations', icon: '▣' },
    { label: 'Claim Order', path: '/claim-order', icon: '✓' },
    { label: 'Daily Reports', path: '/daily-reports', icon: '▥' }
  ];

  constructor(private router: Router) {}

  get isLoginPage(): boolean {
    return this.router.url.split('?')[0].split('#')[0] === '/login';
  }
}
