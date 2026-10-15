import { Component, DestroyRef, ElementRef, ViewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { NgTemplateOutlet } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { AuthService } from '../../../core/services/auth.service';
import { LoginErrorCode, LoginMethod, OtpChallenge } from '../../../core/models/auth.models';
import { AppButtonComponent } from '../../../shared/components/button/app-button.component';
import { AppFormErrorComponent } from '../../../shared/components/form-error/app-form-error.component';
import { CustomValidators } from '../../../shared/validators/custom-validators';
import { ForgotPasswordDialogComponent } from '../forgot-password-dialog/forgot-password-dialog.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgTemplateOutlet,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatDialogModule,
    AppButtonComponent,
    AppFormErrorComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent {
  @ViewChild('passwordInput') private passwordInput?: ElementRef<HTMLInputElement>;
  @ViewChild('otpInput') private otpInput?: ElementRef<HTMLInputElement>;

  /** Shared by both methods, so switching tabs keeps the typed login ID. */
  readonly form = this.fb.group({
    username: ['', [Validators.required, CustomValidators.noWhitespace]],
    password: ['', [Validators.required]],
  });

  /** Validators are set per challenge, since the code length comes from Security Settings. */
  readonly otpCode = this.fb.control('', [Validators.required]);

  method: LoginMethod = 'Password';
  /** Set once a code has been sent; switches the OTP tab to the "enter code" step. */
  otpChallenge: OtpChallenge | null = null;
  resendIn = 0;
  private resendTimer?: ReturnType<typeof setInterval>;

  loading = false;
  hidePassword = true;
  capsLockOn = false;
  /** Toggled briefly on a failed login to trigger the shake animation, then cleared so it can replay next time. */
  loginFailed = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    destroyRef: DestroyRef,
  ) {
    destroyRef.onDestroy(() => clearInterval(this.resendTimer));
  }

  /** Set when the user was signed out automatically (Settings → Security → Session Timeout). */
  get signedOutForInactivity(): boolean {
    return this.route.snapshot.queryParamMap.get('reason') === 'timeout';
  }

  get loginIdControl() {
    return this.form.controls.username;
  }

  setMethod(method: LoginMethod): void {
    if (this.method === method) return;
    this.method = method;
    this.resetOtp();
  }

  togglePasswordVisibility(): void {
    this.hidePassword = !this.hidePassword;
  }

  onPasswordKeyEvent(event: KeyboardEvent): void {
    this.capsLockOn = event.getModifierState?.('CapsLock') ?? false;
  }

  // ---- Password -------------------------------------------------------------

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { username, password } = this.form.getRawValue();
    this.loading = true;

    this.authService.login({ identifier: username!.trim(), password: password!, rememberMe: true }).subscribe({
      next: () => this.onLoggedIn(),
      error: (error: HttpErrorResponse) => {
        this.onFailed(error, 'Incorrect login ID or password.');
        this.passwordInput?.nativeElement.focus();
      },
    });
  }

  // ---- OTP ------------------------------------------------------------------

  onSendOtp(): void {
    if (this.loginIdControl.invalid) {
      this.loginIdControl.markAsTouched();
      return;
    }

    this.loading = true;
    this.authService.requestOtp(this.loginIdControl.value!.trim()).subscribe({
      next: (challenge) => {
        this.loading = false;
        this.otpChallenge = challenge;
        this.otpCode.setValidators([Validators.required, Validators.pattern(new RegExp(`^\\d{${challenge.length}}$`))]);
        this.otpCode.reset('');
        this.startResendCountdown(challenge.resendAfter);
        setTimeout(() => this.otpInput?.nativeElement.focus());
      },
      error: (error: HttpErrorResponse) => this.onFailed(error, 'Could not send the OTP.'),
    });
  }

  onVerifyOtp(): void {
    if (this.otpCode.invalid) {
      this.otpCode.markAsTouched();
      return;
    }

    this.loading = true;
    this.authService.verifyOtp(this.loginIdControl.value!.trim(), this.otpCode.value!).subscribe({
      next: () => this.onLoggedIn(),
      error: (error: HttpErrorResponse) => {
        this.onFailed(error, 'Incorrect OTP.');
        this.otpCode.reset('');
        this.otpInput?.nativeElement.focus();
      },
    });
  }

  /** Keeps the code field digits-only as the user types or pastes. */
  onOtpInput(): void {
    const digits = (this.otpCode.value ?? '').replace(/\D/g, '').slice(0, this.otpChallenge?.length ?? 6);
    if (digits !== this.otpCode.value) this.otpCode.setValue(digits);
  }

  resetOtp(): void {
    this.otpChallenge = null;
    this.otpCode.reset('');
    this.resendIn = 0;
    clearInterval(this.resendTimer);
  }

  private startResendCountdown(seconds: number): void {
    clearInterval(this.resendTimer);
    this.resendIn = seconds;
    this.resendTimer = setInterval(() => {
      this.resendIn = Math.max(0, this.resendIn - 1);
      if (this.resendIn === 0) clearInterval(this.resendTimer);
    }, 1000);
  }

  // ---- Shared ---------------------------------------------------------------

  private onLoggedIn(): void {
    this.loading = false;
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/dashboard';
    this.router.navigateByUrl(returnUrl);
  }

  private onFailed(error: HttpErrorResponse, fallback: string): void {
    this.loading = false;
    const code = error.error?.code as LoginErrorCode | undefined;

    // Wrong method for this account: move the user to the right tab instead of just failing.
    if (code === 'USE_OTP' || code === 'USE_PASSWORD') {
      this.setMethod(code === 'USE_OTP' ? 'OTP' : 'Password');
      this.snackBar.open(`${error.error.message} We've switched the login method for you.`, 'OK', { duration: 5000 });
      return;
    }

    // Locked (Maximum Login Attempts reached): leave the OTP code step; nothing more can be tried.
    if (code === 'LOCKED') this.resetOtp();

    const message =
      error.status === 401 || error.status === 404
        ? (error.error?.message ?? fallback)
        : 'Something went wrong while signing you in. Please try again.';
    this.snackBar.open(message, 'Dismiss', {
      duration: code === 'LOCKED' ? 8000 : 5000,
      panelClass: 'app-snackbar--error',
    });

    // Brief shake for a clear "try again" cue.
    this.loginFailed = true;
    setTimeout(() => (this.loginFailed = false), 500);
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    this.dialog.open(ForgotPasswordDialogComponent, {
      width: '440px',
      maxWidth: '92vw',
      panelClass: 'forgot-password-modal-panel',
    });
  }
}
