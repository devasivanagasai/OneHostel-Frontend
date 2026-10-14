import { Component, Input } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { AppFormErrorComponent } from '../../../../../shared/components/form-error/app-form-error.component';

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

@Component({
  selector: 'app-step-hostel-info',
  standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatIconModule, AppFormErrorComponent],
  template: `
    <div [formGroup]="formGroup" class="step-sections">
      <section class="step-section">
      <h3 class="step-section__title">Basic Details</h3>
      <div class="step-grid step-grid--4">
        <div class="field-group">
          <label class="field-label">Hostel Name<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="hostelName" placeholder="Enter hostel name" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelName')" label="Hostel name"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Hostel Type<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="hostelType" placeholder="Select hostel type">
              <mat-option value="Regular Hostel">Regular Hostel</mat-option>
              <mat-option value="College Hostel">College Hostel</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelType')" label="Hostel type"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Hostel Category<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="hostelCategory" placeholder="Select hostel category">
              <mat-option value="Premium">Premium</mat-option>
              <mat-option value="Standard">Standard</mat-option>
              <mat-option value="Economy">Economy</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('hostelCategory')" label="Hostel category"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Gender<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <mat-select formControlName="gender" placeholder="Select gender">
              <mat-option value="Male">Male</mat-option>
              <mat-option value="Female">Female</mat-option>
              <mat-option value="Co-ed">Co-ed</mat-option>
            </mat-select>
          </mat-form-field>
          <app-form-error [control]="formGroup.get('gender')" label="Gender"></app-form-error>
        </div>
      </div>
      </section>

      <section class="step-section">
      <h3 class="step-section__title">Contact &amp; Online Presence</h3>
      <div class="step-grid step-grid--4">
        <div class="field-group">
          <label class="field-label">Mobile Number<span class="required-mark">*</span></label>
          <div class="combined-phone-field">
            <select class="phone-code-select" formControlName="contactCountryCode">
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+91">+91</option>
              <option value="+61">+61</option>
              <option value="+971">+971</option>
            </select>
            <span class="phone-divider"></span>
            <input
              type="tel"
              class="phone-number-input"
              formControlName="contactNumber"
              placeholder="Enter mobile number"
              maxlength="10"
              inputmode="numeric"
            />
          </div>
          <app-form-error [control]="formGroup.get('contactNumber')" label="Mobile number"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Email<span class="required-mark">*</span></label>
          <mat-form-field appearance="outline">
            <input matInput type="email" formControlName="email" placeholder="Enter email address" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('email')" label="Email"></app-form-error>
        </div>

        <!-- Same country code + number box as Mobile Number -->
        <div class="field-group">
          <label class="field-label">Alternate Mobile Number</label>
          <div class="combined-phone-field">
            <select class="phone-code-select" formControlName="alternateCountryCode">
              <option value="+1">+1</option>
              <option value="+44">+44</option>
              <option value="+91">+91</option>
              <option value="+61">+61</option>
              <option value="+971">+971</option>
            </select>
            <span class="phone-divider"></span>
            <input
              type="tel"
              class="phone-number-input"
              formControlName="alternateContact"
              placeholder="Enter alternate mobile number"
              maxlength="10"
              inputmode="numeric"
            />
          </div>
          <app-form-error [control]="formGroup.get('alternateContact')" label="Alternate mobile number"></app-form-error>
        </div>

        <div class="field-group">
          <label class="field-label">Website</label>
          <mat-form-field appearance="outline">
            <input matInput formControlName="website" placeholder="Enter website (e.g., https://yourhostel.com)" />
          </mat-form-field>
          <app-form-error [control]="formGroup.get('website')" label="Website"></app-form-error>
        </div>
      </div>
      </section>

      <section class="step-section">
        <h3 class="step-section__title">Branding</h3>
        <div class="field-group">
          <label class="field-label">Hostel Logo</label>
          <div class="logo-upload" [class.logo-upload--done]="formGroup.get('logoFileName')?.value">
            <span class="logo-upload__icon"><mat-icon fontSet="material-icons-outlined">{{ formGroup.get('logoFileName')?.value ? 'image' : 'cloud_upload' }}</mat-icon></span>
            <div class="logo-upload__text">
              <span class="logo-upload__title">{{ formGroup.get('logoFileName')?.value || 'Upload hostel logo' }}</span>
              <span class="logo-upload__hint">Recommended size: 512 x 512px. Max file size: 2MB.</span>
              <div class="logo-upload__actions">
                <button type="button" class="logo-upload__btn" (click)="fileInput.click()">
                  <mat-icon>upload</mat-icon>
                  {{ formGroup.get('logoFileName')?.value ? 'Replace File' : 'Choose File' }}
                </button>
                @if (formGroup.get('logoFileName')?.value) {
                  <button type="button" class="logo-upload__remove" (click)="removeLogo()">Remove</button>
                }
                <span class="logo-upload__formats">Supported formats: JPG, PNG, JPEG</span>
              </div>
              @if (logoError) {
                <span class="logo-upload__error" role="alert">{{ logoError }}</span>
              }
            </div>
          </div>
          <input #fileInput type="file" accept="image/jpeg,image/png,image/jpg" class="upload-input" (change)="onLogoSelected($event)" />
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      .step-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 16px;
        margin-bottom: 28px;

        @media (max-width: 720px) {
          grid-template-columns: 1fr;
        }
      }

      /* Single bordered box housing both the country-code select and the
         number input, matching the plain-label + bordered-box look used
         for every other field — this one is custom since it holds two
         native controls, which a single mat-form-field can't host at once. */
      .combined-phone-field {
        display: flex;
        align-items: center;
        width: 100%;
        height: 44px;
        background: #ffffff;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        padding: 0 12px;
        transition: border-color 0.15s ease;

        &:focus-within {
          border-color: #0057e7;
          border-width: 2px;
          padding: 0 11px;
        }
      }

      .phone-code-select {
        border: none;
        outline: none;
        background: transparent;
        font-size: 13.5px;
        color: #1e293b;
        padding-right: 8px;
        cursor: pointer;
      }

      .phone-divider {
        width: 1px;
        height: 20px;
        background: #e2e8f0;
        margin-right: 10px;
        flex-shrink: 0;
      }

      .phone-number-input {
        flex: 1 1 auto;
        min-width: 0;
        border: none;
        outline: none;
        background: transparent;
        font-size: 13.5px;
        color: #1e293b;

        &::placeholder {
          color: #94a3b8;
        }
      }

      /* Logo upload card */
      .logo-upload {
        display: flex;
        align-items: center;
        gap: 28px;
        max-width: 560px; /* compact box, not stretched across the whole section */
        padding: 22px 28px;
        border: 1.5px dashed #cbd5e1;
        border-radius: 12px;
        background: #ffffff;
        transition: border-color 0.15s ease, background 0.15s ease;

        &:hover {
          border-color: #93c5fd;
          background: #fbfdff;
        }
      }

      .logo-upload--done {
        border-style: solid;
        border-color: #bfdbfe;
        background: #f8fbff;
      }

      .logo-upload__icon {
        width: 80px;
        height: 80px;
        flex-shrink: 0;
        border-radius: 50%;
        background: #eff6ff;
        color: #2563eb;
        display: flex;
        align-items: center;
        justify-content: center;

        mat-icon {
          font-size: 34px;
          width: 34px;
          height: 34px;
        }
      }

      .logo-upload__text {
        display: flex;
        flex-direction: column;
        gap: 6px;
        min-width: 0;
      }

      .logo-upload__title {
        font-size: 15px;
        font-weight: 600;
        color: #0f172a;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .logo-upload__hint,
      .logo-upload__formats {
        font-size: 12.5px;
        color: #64748b;
      }

      .logo-upload__actions {
        display: flex;
        align-items: center;
        gap: 14px;
        flex-wrap: wrap;
        margin-top: 6px;
      }

      .logo-upload__btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        height: var(--btn-height);
        padding: 0 var(--btn-padding-x);
        border: none;
        border-radius: var(--btn-radius);
        background: #2563eb;
        color: #ffffff;
        font: inherit;
        font-size: var(--btn-font-size);
        font-weight: 600;
        cursor: pointer;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
        }

        &:hover {
          background: #1d4ed8;
        }
      }

      .logo-upload__remove {
        border: none;
        background: none;
        padding: 0;
        font: inherit;
        font-size: 13px;
        font-weight: 600;
        color: #dc2626;
        cursor: pointer;
      }

      .logo-upload__error {
        font-size: 12.5px;
        color: #dc2626;
      }

      @media (max-width: 600px) {
        .logo-upload {
          flex-direction: column;
          align-items: flex-start;
          gap: 14px;
        }
      }

      .upload-input {
        display: none;
      }
    `,
  ],
})
export class StepHostelInfoComponent {
  @Input({ required: true }) formGroup!: FormGroup;

  logoError = '';

  onLogoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = ''; // let the same file be picked again
    if (!file) return;
    if (file.size > MAX_LOGO_BYTES) {
      this.logoError = 'The logo must be 2MB or smaller.';
      return;
    }
    this.logoError = '';
    this.formGroup.get('logoFileName')?.setValue(file.name);
    this.formGroup.markAsDirty();
  }

  removeLogo(): void {
    this.logoError = '';
    this.formGroup.get('logoFileName')?.setValue('');
    this.formGroup.markAsDirty();
  }
}
