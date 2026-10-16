import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ResidentsService } from '../../residents/residents.service';
import { residentFullName } from '../../residents/residents.models';
import { OneTimeChargeInput } from '../fees.service';
import { TAX_OPTIONS } from '../fees.models';

/** Authorised one-time charge (fine, damage, event fee…) for one or more residents. */
@Component({
  selector: 'app-charge-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    <div class="cd">
      <header class="cd__header">
        <div class="cd__title">
          <span><mat-icon>post_add</mat-icon></span>
          <div>
            <h2>One-time Charge</h2>
            <p>Creates a separate invoice for each selected resident.</p>
          </div>
        </div>
        <button mat-icon-button type="button" (click)="cancel()" aria-label="Close dialog"><mat-icon>close</mat-icon></button>
      </header>

      <form [formGroup]="form" (ngSubmit)="submit()" novalidate>
        <mat-dialog-content class="cd__content">
          <mat-form-field appearance="outline" class="cd__full">
            <mat-label>Residents</mat-label>
            <mat-select formControlName="residentIds" multiple required>
              @for (r of residents; track r.id) { <mat-option [value]="r.id">{{ r.label }}</mat-option> }
            </mat-select>
            @if (form.controls.residentIds.touched && form.controls.residentIds.invalid) { <mat-error>Select at least one resident</mat-error> }
          </mat-form-field>

          <mat-form-field appearance="outline" class="cd__full">
            <mat-label>Description</mat-label>
            <input matInput formControlName="description" maxlength="80" placeholder="e.g. Room key replacement" required />
            @if (form.controls.description.touched && form.controls.description.invalid) { <mat-error>Description is required</mat-error> }
          </mat-form-field>

          <div class="cd__grid">
            <mat-form-field appearance="outline">
              <mat-label>Amount</mat-label>
              <span matTextPrefix>₹&nbsp;</span>
              <input matInput type="number" min="0.01" step="0.01" formControlName="amount" required />
              @if (form.controls.amount.touched && form.controls.amount.invalid) { <mat-error>Amount must be greater than zero</mat-error> }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Tax</mat-label>
              <mat-select formControlName="taxRate">
                @for (t of taxOptions; track t.rate) { <mat-option [value]="t.rate">{{ t.label }}</mat-option> }
              </mat-select>
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Due date</mat-label>
              <input matInput type="date" formControlName="dueDate" [min]="today" required />
              @if (form.controls.dueDate.touched && form.controls.dueDate.invalid) { <mat-error>Pick a due date</mat-error> }
            </mat-form-field>
          </div>

          @if (form.value.residentIds?.length && (form.value.amount ?? 0) > 0) {
            <p class="cd__info">
              <mat-icon>receipt_long</mat-icon>
              <span>{{ form.value.residentIds!.length }} invoice{{ form.value.residentIds!.length === 1 ? '' : 's' }} of
                <strong>₹{{ total | number: '1.0-2' }}</strong> each{{ form.value.taxRate ? ' (incl. tax)' : '' }}.</span>
            </p>
          }
        </mat-dialog-content>

        <footer class="cd__footer">
          <button mat-stroked-button type="button" (click)="cancel()">Cancel</button>
          <button mat-flat-button color="primary" type="submit">Create charge</button>
        </footer>
      </form>
    </div>
  `,
  styleUrl: './charge-dialog.component.scss',
})
export class ChargeDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<ChargeDialogComponent, OneTimeChargeInput>);

  readonly today = new Date().toISOString().slice(0, 10);
  readonly taxOptions = TAX_OPTIONS;
  readonly residents = inject(ResidentsService)
    .residents.filter((r) => !r.deactivatedAt && r.status !== 'Checked Out')
    .map((r) => ({ id: r.residentId, label: `${residentFullName(r)} · ${r.residentId}` }));

  readonly form = this.fb.nonNullable.group({
    residentIds: [[] as string[], Validators.required],
    description: ['', [Validators.required, Validators.maxLength(80)]],
    amount: [0, [Validators.required, Validators.min(0.01)]],
    taxRate: [0],
    dueDate: [this.today, Validators.required],
  });

  get total(): number {
    const { amount, taxRate } = this.form.getRawValue();
    return Math.round(amount * (1 + taxRate / 100) * 100) / 100;
  }

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.dialogRef.close({ ...v, amount: Number(v.amount), description: v.description.trim() });
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
