import { Injectable, NgZone } from '@angular/core';
import { AuthService } from './auth.service';
import { SystemSettingsService } from './system-settings.service';

const LAST_ACTIVITY_KEY = 'onehostel_last_activity';
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'wheel'] as const;
/** Activity is recorded at most this often, so mouse moves don't hammer localStorage. */
const WRITE_THROTTLE_MS = 5_000;
const CHECK_INTERVAL_MS = 15_000;

/**
 * Signs the user out after Settings → Security → Session Timeout minutes with no
 * activity. The last activity time is kept in localStorage, so it is shared by
 * every open tab and still applies after the browser was closed and reopened.
 */
@Injectable({ providedIn: 'root' })
export class SessionTimeoutService {
  private timer?: ReturnType<typeof setInterval>;
  private lastWrite = 0;
  private readonly onActivity = () => this.touch();

  constructor(
    private auth: AuthService,
    private settings: SystemSettingsService,
    private zone: NgZone,
  ) {}

  /** Starts watching; call when the signed-in area loads. */
  start(): void {
    if (this.timer) return;
    // Coming back after the timeout (e.g. a closed browser): sign out straight away.
    if (this.isExpired()) {
      this.signOut();
      return;
    }
    this.touch(true);
    // Outside Angular so mouse moves don't trigger change detection.
    this.zone.runOutsideAngular(() => {
      ACTIVITY_EVENTS.forEach((e) => window.addEventListener(e, this.onActivity, { passive: true }));
      this.timer = setInterval(() => {
        if (this.isExpired()) this.zone.run(() => this.signOut());
      }, CHECK_INTERVAL_MS);
    });
  }

  /**
   * Stops watching and forgets the last activity, so the next login starts fresh.
   * (Closing the browser never calls this, which is why a stale time still signs out on return.)
   */
  stop(): void {
    ACTIVITY_EVENTS.forEach((e) => window.removeEventListener(e, this.onActivity));
    clearInterval(this.timer);
    this.timer = undefined;
    try {
      localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      // ignore
    }
  }

  private get timeoutMs(): number {
    const minutes = Number(this.settings.settings.security.sessionTimeoutMinutes);
    return (minutes > 0 ? minutes : 30) * 60_000;
  }

  private isExpired(): boolean {
    const last = Number(localStorage.getItem(LAST_ACTIVITY_KEY) ?? 0);
    return last > 0 && Date.now() - last > this.timeoutMs;
  }

  private touch(force = false): void {
    const now = Date.now();
    if (!force && now - this.lastWrite < WRITE_THROTTLE_MS) return;
    this.lastWrite = now;
    try {
      localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
    } catch {
      // Storage blocked: the timeout can't be tracked in this mock build.
    }
  }

  private signOut(): void {
    this.stop();
    if (this.auth.isAuthenticated()) this.auth.logout('timeout');
  }
}
