
import { Routes } from '@angular/router';

import { Dashboard } from './pages/dashboard/dashboard';
import { NewOrder } from './pages/new-order/new-order';
import { ActiveOrders } from './pages/active-orders/active-orders';
import { Reservations } from './pages/reservations/reservations';
import { ClaimOrder } from './pages/claim-order/claim-order';
import { DailyReports } from './pages/daily-reports/daily-reports';
import { Login } from './pages/login/login';

import { authGuard } from './services/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },

  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },

  {
    path: 'dashboard',
    component: Dashboard,
    canActivate: [authGuard]
  },
  {
    path: 'new-order',
    component: NewOrder,
    canActivate: [authGuard]
  },
  {
    path: 'active-orders',
    component: ActiveOrders,
    canActivate: [authGuard]
  },
  {
    path: 'reservations',
    component: Reservations,
    canActivate: [authGuard]
  },
  {
    path: 'claim-order',
    component: ClaimOrder,
    canActivate: [authGuard]
  },
  {
    path: 'daily-reports',
    component: DailyReports,
    canActivate: [authGuard]
  },

  { path: '**', redirectTo: 'dashboard' }
];
