import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { AppFormErrorComponent } from '../../../../../shared/components/form-error/app-form-error.component';
import { LOGIN_METHOD_OPTIONS } from '../../../../../core/models/auth.models';

@Component({
  selector: 'app-step-admin',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    AppFormErrorComponent,
  ],
  template: `
    <div [formGroup]="formGroup" class="step-grid">
      <div class="field-group">
        <label class="field-label">First Name<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="firstName" placeholder="Enter First Name" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('firstName')" label="First name"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Last Name</label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="lastName" placeholder="Optional" />
        </mat-form-field>
      </div>

      <div class="field-group">
        <label class="field-label">Mobile Number<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput type="tel" formControlName="mobileNumber" placeholder="Enter Mobile Number" maxlength="10" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('mobileNumber')" label="Mobile number"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Email<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput type="email" formControlName="email" placeholder="Enter Email Address" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('email')" label="Email"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Username<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <input matInput formControlName="username" placeholder="Enter Username" />
        </mat-form-field>
        <app-form-error [control]="formGroup.get('username')" label="Username"></app-form-error>
      </div>

      <div class="field-group">
        <label class="field-label">Login Method<span class="required-mark">*</span></label>
        <mat-form-field appearance="outline">
          <mat-select formControlName="loginMethod" placeholder="Select Login Method">
            @for (option of loginMethodOptions; track option.value) {
              <mat-option [value]="option.value">{{ option.label }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <app-form-error [control]="formGroup.get('loginMethod')" label="Login method"></app-form-error>
        <p class="field-hint">
          @if (isOtp) {
            The hostel owner logs in with a one-time code sent to their mobile number or email. Code length and expiry come from System Defaults → Security.
          } @else {
            The hostel owner logs in with their username, email or mobile number and a password.
          }
        </p>
      </div>

      @if (!isOtp) {
        <div class="field-group">
          <label class="field-label">Temporary Password</label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="tempPassword" readonly />
            <button mat-icon-button matSuffix type="button" aria-label="Regenerate password" (click)="regenerate.emit()">
              <mat-icon>autorenew</mat-icon>
            </button>
          </mat-form-field>
          <p class="field-hint">System-generated using the password format in System Defaults → Security. Regenerate any time before creating the hostel.</p>
        </div>
      }

      <div class="field-group">
        <label class="field-label">Role</label>
        <mat-form-field appearance="outline">
          <input matInput value="Hostel Owner" readonly />
        </mat-form-field>
      </div>
    </div>
  `,
  styles: [
    `
      .step-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;

        @media (max-width: 720px) {
          grid-template-columns: 1fr;
        }
      }

      .step-grid__full {
        grid-column: 1 / -1;
      }

      .field-hint {
        margin: 4px 4px 0;
        font-size: 12px;
        color: #94a3b8;

        strong {
          font-weight: 600;
          color: #334155;
        }
      }
    `,
  ],
})
export class StepAdminComponent {
  @Input({ required: true }) formGroup!: FormGroup;
  @Output() regenerate = new EventEmitter<void>();

  readonly loginMethodOptions = LOGIN_METHOD_OPTIONS;

  get isOtp(): boolean {
    return this.formGroup.get('loginMethod')?.value === 'OTP';
  }
}
