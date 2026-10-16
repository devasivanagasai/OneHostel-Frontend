import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable, delay, of, switchMap, tap, throwError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthUser, LoginErrorCode, LoginRequest, LoginResponse, OtpChallenge } from '../models/auth.models';
import { AuditLogService } from './audit-log.service';
import { HostelAdminAccount, HostelAdminAccountService } from './hostel-admin-account.service';
import { builtInPassword, findBuiltInAccount } from '../models/built-in-accounts';
import { SystemSettingsService } from './system-settings.service';

const TOKEN_KEY = 'onehostel_token';
const USER_KEY = 'onehostel_user';
/** Admin-only modules. Hostel Owners and Tenants see only the Dashboard and their own account pages. */
export const ADMIN_ONLY_ROUTES = [
  '/hostel-onboarding',
  '/subscription-plans',
  '/communication-templates',
  '/admins',
  '/users',
  '/subscription-payments',
  '/reports',
  '/audit-logs',
  '/settings',
  '/institution',
  '/hostels',
];
/** When this browser last signed in (ISO). Kept after sign-out so My Profile can show it. */
const LAST_LOGIN_KEY = 'onehostel_last_login';
/** Used if Security Settings has no valid OTP Expiry. */
const DEFAULT_OTP_EXPIRY_MINUTES = 5;
/** Used if Security Settings has no valid Maximum Login Attempts. */
const DEFAULT_MAX_LOGIN_ATTEMPTS = 5;
const OTP_RESEND_SECONDS = 30;

/** "rakesh.verma@x.com" → "ra••••••@x.com" */
function maskEmail(email: string): string {
  const [name, domain] = email.split('@');
  return `${name.slice(0, 2)}••••••@${domain ?? ''}`;
}

/**
 * Single source of truth for auth state. Persists the session to
 * localStorage (rememberMe) or sessionStorage (tab-only) and exposes the
 * current user as an observable so any component (e.g. the header) can
 * react to login/logout without re-fetching anything.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  private readonly currentUserSubject = new BehaviorSubject<AuthUser | null>(this.readUser());
  readonly currentUser$: Observable<AuthUser | null> = this.currentUserSubject.asObservable();

  /** The last OTP issued (mock only — a real backend keeps this server-side). */
  private pendingOtp: { hostelId: string; code: string; expiresAt: number } | null = null;

  constructor(
    private http: HttpClient,
    private router: Router,
    private auditLog: AuditLogService,
    private hostelAdmins: HostelAdminAccountService,
    private systemSettings: SystemSettingsService,
  ) {}

  get currentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  login(request: LoginRequest): Observable<LoginResponse> {
    // No backend exists yet for this UI-only build, so login is simulated
    // locally instead of calling `${this.apiUrl}/login`. Swap the body below
    // for `this.http.post<LoginResponse>(...)` once a real auth endpoint is
    // available — the rest of the app (guards, interceptor, currentUser$)
    // already expects exactly this Observable<LoginResponse> shape.
    const identifier = request.identifier.trim();
    const account = this.hostelAdmins.findByIdentifier(identifier);

    if (account) {
      if (account.lockedAt) return this.lockedError();
      // Hostel admins must use the Login Method chosen at onboarding.
      if (account.loginMethod === 'OTP') {
        return this.fail('This account signs in with OTP.', 401, 'USE_OTP');
      }
      if (request.password !== account.password) {
        return this.failedAttempt(account, 'Incorrect password.');
      }
      this.hostelAdmins.resetFailedAttempts(account.hostelId);
      return this.completeLogin(this.hostelAdminResponse(account), request.rememberMe ?? false);
    }

    // Built-in Admin / Tenant sign-ins (see built-in-accounts.ts) check their password.
    const builtIn = findBuiltInAccount(identifier);
    if (builtIn) {
      if (request.password !== builtInPassword(builtIn)) {
        this.auditLog.record('Login', builtIn.email, { status: 'Failed', details: 'Incorrect password.' });
        return this.fail('Incorrect password.');
      }
      return this.completeLogin(
        {
          token: `mock-token-${Date.now()}`,
          user: {
            id: builtIn.id,
            name: `${builtIn.firstName} ${builtIn.lastName}`,
            email: builtIn.email,
            roles: [builtIn.role],
          },
        },
        request.rememberMe ?? false,
      );
    }

    // Anyone else is treated as the mock Admin.
    return this.completeLogin(
      { token: `mock-token-${Date.now()}`, user: { id: 'mock-superadmin', name: identifier, email: identifier } },
      request.rememberMe ?? false,
    );
  }

  /** Sends a one-time code to an OTP-method hostel admin (mocked: the code is returned for display). */
  requestOtp(identifier: string): Observable<OtpChallenge> {
    const account = this.hostelAdmins.findByIdentifier(identifier);
    if (!account) {
      return this.fail('No account found for this mobile number or email.', 404);
    }
    if (account.lockedAt) return this.lockedError();
    if (account.loginMethod !== 'OTP') {
      return this.fail('This account signs in with a password.', 401, 'USE_PASSWORD');
    }

    const security = this.systemSettings.settings.security;
    const length = Number(security.otpLength) === 4 ? 4 : 6;
    const code = String(Math.floor(10 ** (length - 1) + Math.random() * 9 * 10 ** (length - 1)));
    const ttlMinutes = Number(security.otpExpiryMinutes) || DEFAULT_OTP_EXPIRY_MINUTES;
    this.pendingOtp = { hostelId: account.hostelId, code, expiresAt: Date.now() + ttlMinutes * 60_000 };

    // Codes go to the email when the admin typed their email, otherwise to their mobile.
    const typedEmail = identifier.includes('@');
    const sentTo = typedEmail ? maskEmail(account.email) : `••••••${account.mobileNumber.slice(-4)}`;
    return of({ sentTo, length, resendAfter: OTP_RESEND_SECONDS, demoCode: code }).pipe(delay(600));
  }

  verifyOtp(identifier: string, code: string, rememberMe = true): Observable<LoginResponse> {
    const account = this.hostelAdmins.findByIdentifier(identifier);
    const pending = this.pendingOtp;

    if (account?.lockedAt) {
      this.pendingOtp = null;
      return this.lockedError();
    }
    if (!account || !pending || pending.hostelId !== account.hostelId) {
      return this.fail('Please request a new OTP.');
    }
    if (Date.now() > pending.expiresAt) {
      this.pendingOtp = null;
      return this.fail('This OTP has expired. Please request a new one.');
    }
    if (code.trim() !== pending.code) {
      return this.failedAttempt(account, 'Incorrect OTP.');
    }

    this.pendingOtp = null;
    this.hostelAdmins.resetFailedAttempts(account.hostelId);
    return this.completeLogin(this.hostelAdminResponse(account), rememberMe);
  }

  /** Counts a wrong password/OTP against Settings → Security → Maximum Login Attempts. */
  private failedAttempt(account: HostelAdminAccount, message: string): Observable<never> {
    const max = Number(this.systemSettings.settings.security.maxLoginAttempts) || DEFAULT_MAX_LOGIN_ATTEMPTS;
    const { locked, remaining } = this.hostelAdmins.recordFailedAttempt(account.hostelId, max);
    this.auditLog.record('Login', account.username || account.email, {
      status: 'Failed',
      details: locked ? `Account locked after ${max} failed attempts.` : message,
    });
    if (locked) {
      this.pendingOtp = null;
      return this.lockedError();
    }
    return this.fail(`${message} ${remaining} attempt${remaining === 1 ? '' : 's'} left before the account is locked.`);
  }

  private lockedError(): Observable<never> {
    return this.fail(
      'This account is locked after too many failed login attempts. Contact your Admin to unlock it.',
      401,
      'LOCKED',
    );
  }

  /** `reason: 'timeout'` is passed on to the login page to explain an automatic sign-out. */
  logout(reason?: 'timeout'): void {
    const user = this.currentUser;
    if (user) {
      this.auditLog.record('Logout', user.name, {
        user: user.name,
        details: reason === 'timeout' ? 'Signed out automatically after inactivity (Session Timeout).' : undefined,
      });
    }
    this.clearSession();
    this.router.navigate(['/login'], reason ? { queryParams: { reason } } : {});
  }

  /**
   * Admin role: the built-in Admin, or the mock Admin sign-in (which carries no roles).
   * Hostel Owners and Tenants are not Admins.
   */
  get isAdmin(): boolean {
    const roles = this.currentUser?.roles;
    return !roles?.length || roles.includes('Admin');
  }

  get isHostelOwner(): boolean {
    const roles = this.currentUser?.roles;
    return !!roles && (roles.includes('HostelOwner') || roles.includes('Hostel Owner'));
  }

  get isTenant(): boolean {
    const roles = this.currentUser?.roles;
    return !!roles && roles.includes('Tenant');
  }

  /** Whether the signed-in user may open this route (the Admin modules are Admin-only). */
  canAccess(route: string): boolean {
    // Hostel-owner-only routes (rooms, residents, fees) are closed to Tenants
    if (['/rooms', '/residents', '/fees'].some((r) => route.startsWith(r)) && this.isTenant) {
      return false;
    }
    return this.isAdmin || !ADMIN_ONLY_ROUTES.some((r) => route === r || route.startsWith(r + '/'));
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY);
  }

  /** Applies profile edits (name, email, photo) to the session so the header updates immediately. */
  updateCurrentUser(changes: Partial<Pick<AuthUser, 'name' | 'email' | 'avatarUrl'>>): void {
    const user = this.currentUser;
    if (!user) return;
    const updated: AuthUser = { ...user, ...changes };
    // Write back to whichever storage holds this session (remember-me vs tab-only).
    const storage = localStorage.getItem(TOKEN_KEY) ? localStorage : sessionStorage;
    try {
      storage.setItem(USER_KEY, JSON.stringify(updated));
    } catch {
      // Storage full (a large photo can do this) — the change still applies for this session.
    }
    this.currentUserSubject.next(updated);
  }

  private hostelAdminResponse(account: HostelAdminAccount): LoginResponse {
    return {
      token: `mock-token-${Date.now()}`,
      user: {
        id: `${account.hostelId}-admin`,
        name: account.name || account.username,
        email: account.email,
        roles: ['HostelOwner'],
      },
    };
  }

  private completeLogin(response: LoginResponse, rememberMe: boolean): Observable<LoginResponse> {
    return of(response).pipe(
      delay(600),
      tap((res) => {
        this.setSession(res, rememberMe);
        this.auditLog.record('Login', res.user.name);
      }),
    );
  }

  /** A rejected request, shaped like the error a real endpoint would return. */
  private fail(message?: string, status = 401, code?: LoginErrorCode): Observable<never> {
    return timer(600).pipe(
      switchMap(() => throwError(() => new HttpErrorResponse({ status, error: { message, code } }))),
    );
  }

  private setSession(response: LoginResponse, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, response.token);
    storage.setItem(USER_KEY, JSON.stringify(response.user));
    try {
      localStorage.setItem(LAST_LOGIN_KEY, new Date().toISOString());
    } catch {
      // Storage blocked: Last Login just isn't shown.
    }
    this.currentUserSubject.next(response.user);
  }

  /** When the user last signed in on this browser, or null if unknown. */
  get lastLoginAt(): string | null {
    try {
      return localStorage.getItem(LAST_LOGIN_KEY);
    } catch {
      return null;
    }
  }

  private clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    this.currentUserSubject.next(null);
  }

  private readUser(): AuthUser | null {
    const raw = localStorage.getItem(USER_KEY) ?? sessionStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }
}
