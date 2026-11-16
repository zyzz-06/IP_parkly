import { Routes } from '@angular/router';
import { authGuard } from './core/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'map',
    canActivate: [authGuard],
    loadComponent: () => import('./features/map/map').then((m) => m.MapPage),
  },
  { path: '', pathMatch: 'full', redirectTo: 'map' },
  { path: '**', redirectTo: 'map' },
];
