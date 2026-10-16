import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

export interface ReasonDialogData {
  title: string;
  message: string;
  confirmLabel: string;
}

/** Asks for a mandatory reason (≥ 5 chars) before an adjustment such as cancelling a charge. */
@Component({
  selector: 'app-reason-dialog',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  template: `
    <h2 mat-dialog-title>{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="msg">{{ data.message }}</p>
      <mat-form-field appearance="outline" class="full">
        <mat-label>Reason</mat-label>
        <textarea matInput [(ngModel)]="reason" rows="3" maxlength="250" required cdkFocusInitial></textarea>
        <mat-hint>Required · recorded in the audit log</mat-hint>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" mat-dialog-close>Cancel</button>
      <button mat-flat-button color="warn" type="button" [disabled]="reason.trim().length < 5" (click)="ref.close(reason.trim())">
        {{ data.confirmLabel }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      .msg { margin: 0 0 14px; color: #475569; font-size: 13.5px; }
      .full { width: 100%; }
    `,
  ],
})
export class ReasonDialogComponent {
  readonly data = inject<ReasonDialogData>(MAT_DIALOG_DATA);
  readonly ref = inject(MatDialogRef<ReasonDialogComponent, string>);
  reason = '';
}
