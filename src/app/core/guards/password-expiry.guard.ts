import { inject } from '@angular/core';
import { CanActivateChildFn, Router } from '@angular/router';
import { AccountService } from '../services/account.service';

/**
 * Settings → Security → Password Expiry: once the signed-in user's password has
 * expired, every page except Change Password redirects there until a new
 * password is set.
 */
export const passwordExpiryGuard: CanActivateChildFn = (_route, state) => {
  const account = inject(AccountService);
  const router = inject(Router);

  const days = account.passwordExpiresInDays;
  const expired = days !== null && days <= 0;
  if (!expired || state.url.startsWith('/change-password')) return true;

  return router.createUrlTree(['/change-password'], { queryParams: { expired: 1 } });
};
