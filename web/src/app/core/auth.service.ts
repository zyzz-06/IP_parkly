import { Injectable, computed, signal } from '@angular/core';

const STORAGE_KEY = 'parkly.user';

export interface MockUser {
  email: string;
}

/**
 * MVP avtentikacija: login sprejme KATERIKOLI vnos.
 * TODO: zamenjati s Supabase Auth (bearer žeton) – glej docs/decisions/.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly currentUser = signal<MockUser | null>(this.restore());

  readonly user = this.currentUser.asReadonly();
  readonly isLoggedIn = computed(() => this.currentUser() !== null);

  login(email: string, _password: string): void {
    const user: MockUser = { email: email.trim() || 'gost@parkly.si' };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    this.currentUser.set(user);
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this.currentUser.set(null);
  }

  private restore(): MockUser | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      return raw ? (JSON.parse(raw) as MockUser) : null;
    } catch {
      return null;
    }
  }
}
