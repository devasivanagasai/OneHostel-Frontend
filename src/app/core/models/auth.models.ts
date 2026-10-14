export interface LoginRequest {
  /** What the user typed in the login field: an email, mobile number or username. */
  identifier: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles?: string[];
  /** Profile photo as a data URL, when one has been uploaded. */
  avatarUrl?: string;
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}

/** How a hostel admin proves who they are at login. */
export type LoginMethod = 'Password' | 'OTP';

export const LOGIN_METHOD_OPTIONS: { value: LoginMethod; label: string }[] = [
  { value: 'Password', label: 'Password' },
  { value: 'OTP', label: 'OTP' },
];

/**
 * Sent in a login error body: USE_OTP / USE_PASSWORD when the account must use the
 * other Login Method; LOCKED when Maximum Login Attempts was reached.
 */
export type LoginErrorCode = 'USE_OTP' | 'USE_PASSWORD' | 'LOCKED';

export interface OtpChallenge {
  /** Masked destination the code was sent to, e.g. "••••••3210". */
  sentTo: string;
  /** Number of digits in the code (Security Settings → OTP Length). */
  length: number;
  /** Seconds before another code may be requested. */
  resendAfter: number;
  /**
   * The code itself — only returned by the mock backend so it can be shown
   * on screen while no SMS/email gateway exists. A real API never returns it.
   */
  demoCode?: string;
}
