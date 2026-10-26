
import { isPlatformBrowser } from '@angular/common';
import { Inject, Injectable, PLATFORM_ID } from '@angular/core';
import {
  createClient,
  Session,
  SupabaseClient
} from '@supabase/supabase-js';

import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly client: SupabaseClient;
  private readonly isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: object) {
    this.isBrowser = isPlatformBrowser(platformId);

    this.client = createClient(
      environment.supabaseUrl,
      environment.supabasePublishableKey,
      {
        auth: {
          persistSession: this.isBrowser,
          autoRefreshToken: this.isBrowser,
          detectSessionInUrl: this.isBrowser
        }
      }
    );
  }

  async signIn(email: string, password: string) {
    return this.client.auth.signInWithPassword({
      email: email.trim(),
      password
    });
  }

  async getSession(): Promise<Session | null> {
    if (!this.isBrowser) {
      return null;
    }

    const { data, error } = await this.client.auth.getSession();

    if (error) {
      return null;
    }

    return data.session;
  }

  async signOut() {
    return this.client.auth.signOut();
  }
}
