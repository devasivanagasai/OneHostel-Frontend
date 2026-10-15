import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { PaymentTransaction } from './subscription-payment.models';
import { statusTone } from '../../shared/constants/status.constants';
import { SystemSettingsService } from '../../core/services/system-settings.service';
import { AppDatePipe } from '../../shared/pipes/app-date.pipe';
import { AppCurrencyPipe } from '../../shared/pipes/app-currency.pipe';

@Component({
  selector: 'app-invoice-dialog',
  standalone: true,
  imports: [AppDatePipe, AppCurrencyPipe, CommonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="invoice">
      <button type="button" class="inv-close" mat-dialog-close aria-label="Close">
        <mat-icon>close</mat-icon>
      </button>

      <!-- Header: brand | invoice number -->
      <header class="inv-head">
        <div class="brand">
          <span class="brand__logo" aria-hidden="true"><mat-icon>home</mat-icon></span>
          <div class="brand__text">
            <div class="brand__name">{{ appName }}</div>
            <div class="brand__tagline">Hostel Management Platform</div>
            @if (payment.gstin) {
              <div class="brand__gstin">GSTIN: {{ payment.gstin }}</div>
            }
          </div>
        </div>

        <div class="doc">
          <h2 class="doc__label">Invoice</h2>
          <div class="doc__number">{{ payment.invoiceNumber }}</div>
        </div>
      </header>

      <!-- Billed to | Payment info -->
      <section class="card parties">
        <div class="party">
          <div class="label">Billed To</div>
          <div class="party__name">{{ payment.hostelName }}</div>
          <dl class="info-rows">
            <div>
              <dt><span class="info-icon"><mat-icon fontSet="material-icons-outlined">badge</mat-icon></span>Subscription ID</dt>
              <dd>{{ payment.subscriptionId }}</dd>
            </div>
            <div>
              <dt><span class="info-icon"><mat-icon fontSet="material-icons-outlined">calendar_today</mat-icon></span>Issued Date</dt>
              <dd>{{ payment.paymentDate | appDate }}</dd>
            </div>
            <div>
              <dt><span class="info-icon info-icon--{{ tone }}"><mat-icon>{{ statusIcon }}</mat-icon></span>Payment Status</dt>
              <dd><span class="status status--{{ tone }}">{{ payment.paymentStatus }}</span></dd>
            </div>
          </dl>
        </div>

        <div class="parties__divider" aria-hidden="true"></div>

        <div class="party">
          <div class="label">Payment Info</div>
          <div class="pay-box">
            <div class="pay-box__method">
              <span class="info-icon"><mat-icon fontSet="material-icons-outlined">{{ methodIcon }}</mat-icon></span>
              {{ payment.paymentMethod }} • {{ payment.paymentGateway }}
            </div>
            <div class="pay-box__txn">
              <div>
                <div class="pay-box__label">Transaction ID</div>
                <div class="pay-box__value">{{ payment.transactionId }}</div>
              </div>
              <button type="button" class="copy-btn" [attr.aria-label]="copied ? 'Copied' : 'Copy transaction ID'" (click)="copyTxn()">
                <mat-icon fontSet="material-icons-outlined">{{ copied ? 'check' : 'content_copy' }}</mat-icon>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- Line item + totals -->
      <section class="card items">
        <div class="items__head">
          <span>Description</span>
          <span>Amount</span>
        </div>
        <div class="item">
          <span>{{ payment.planName }} Plan - {{ payment.billingCycle }} Subscription</span>
          <span class="item__amount">{{ payment.amount | appCurrency: '1.2-2' }}</span>
        </div>

        <div class="totals-wrap">
          @if (stampLabel) {
            <div class="stamp stamp--{{ tone }}" aria-hidden="true">{{ stampLabel }}</div>
          }
          <dl class="totals">
            <div class="totals__row">
              <dt>{{ payment.taxRate > 0 ? 'Subtotal (excl. GST)' : 'Subtotal' }}</dt>
              <dd>{{ payment.amount | appCurrency: '1.2-2' }}</dd>
            </div>
            @if (payment.taxRate > 0) {
              <div class="totals__row">
                <dt>GST ({{ payment.taxRate }}%)</dt>
                <dd>{{ payment.tax | appCurrency: '1.2-2' }}</dd>
              </div>
            }
            @if (payment.lateFee) {
              <div class="totals__row">
                <dt>Late payment fee ({{ payment.daysLate }} days late)</dt>
                <dd>{{ payment.lateFee | appCurrency: '1.2-2' }}</dd>
              </div>
            }
            <div class="totals__grand">
              <dt>Total Amount</dt>
              <dd>{{ payment.totalAmount | appCurrency: '1.2-2' }}</dd>
            </div>
          </dl>
        </div>
      </section>

      @if (payment.paymentStatus === 'Refunded') {
        <div class="refund-note">
          <mat-icon>info</mat-icon>
          <span>This payment has been refunded to the original payment method.</span>
        </div>
      }

      <div class="inv-actions">
        <button type="button" class="btn-outline" mat-dialog-close>Close</button>
        <button type="button" class="btn-primary" (click)="dialogRef.close('download')">
          <mat-icon>download</mat-icon>
          <span>Download Receipt</span>
        </button>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    /* Rounder dialog shell (panelClass set in InvoiceService). */
    ::ng-deep .invoice-dialog-panel .mat-mdc-dialog-surface {
      border-radius: 20px !important;
      overflow: hidden;
      box-shadow: 0 30px 60px -20px rgba(15, 23, 42, 0.35) !important;
    }

    .invoice {
      position: relative;
      padding: 32px 36px 28px;
      background: #ffffff;
      color: #0f172a;
    }

    .inv-close {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 36px;
      height: 36px;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #64748b;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .inv-close:hover {
      background: #f1f5f9;
      color: #0f172a;
    }

    /* Header */
    .inv-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 24px;
      margin: 8px 0 24px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 16px;
      padding-right: 28px;
      border-right: 1px solid #e5eaf1;
    }

    .brand__logo {
      width: 60px;
      height: 60px;
      flex-shrink: 0;
      border-radius: 50%;
      background: #2563eb;
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
    }

    .brand__logo mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .brand__name {
      font-size: 26px;
      font-weight: 700;
      color: #2563eb;
      line-height: 1.1;
    }

    .brand__tagline {
      margin-top: 6px;
      font-size: 14px;
      font-weight: 500;
      color: #334155;
    }

    .brand__gstin {
      margin-top: 2px;
      font-size: 13px;
      color: #64748b;
    }

    .doc {
      text-align: right;
    }

    .doc__label {
      margin: 0;
      font-size: 40px;
      font-weight: 700;
      line-height: 1.05;
      color: #1e293b;
    }

    .doc__number {
      margin-top: 6px;
      font-size: 17px;
      font-weight: 500;
      color: #334155;
    }

    /* Cards */
    .card {
      background: #ffffff;
      border-radius: 14px;
      box-shadow: 0 2px 10px rgba(15, 23, 42, 0.06), 0 0 0 1px #eef2f7;
    }

    .label {
      margin-bottom: 8px;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #475569;
    }

    .parties {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 1px minmax(0, 1fr);
      gap: 24px;
      padding: 22px 24px;
      margin-bottom: 18px;
    }

    .parties__divider {
      background: repeating-linear-gradient(180deg, #e2e8f0 0 6px, transparent 6px 10px);
    }

    .party__name {
      margin-bottom: 12px;
      font-size: 19px;
      font-weight: 700;
      color: #0f172a;
    }

    .info-rows {
      margin: 0;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .info-rows > div {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .info-rows dt {
      display: inline-flex;
      align-items: center;
      gap: 12px;
      font-size: 14px;
      color: #334155;
    }

    .info-rows dd {
      margin: 0;
      font-size: 14px;
      font-weight: 500;
      color: #0f172a;
    }

    .info-icon {
      width: 30px;
      height: 30px;
      flex-shrink: 0;
      border-radius: 8px;
      background: #eef4ff;
      color: #2563eb;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }

    .info-icon mat-icon {
      font-size: 17px;
      width: 17px;
      height: 17px;
    }

    .info-icon--success { background: #e7f8ee; color: #16a34a; }
    .info-icon--warning { background: #fff4e0; color: #d97706; }
    .info-icon--danger { background: #fee2e2; color: #dc2626; }
    .info-icon--info { background: #e0f2fe; color: #0284c7; }

    .status {
      display: inline-block;
      padding: 4px 16px;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 600;
    }

    .status--success { background: #dcfce7; color: #16a34a; }
    .status--warning { background: #ffedd5; color: #ea580c; }
    .status--danger { background: #fee2e2; color: #dc2626; }
    .status--info { background: #e0f2fe; color: #0284c7; }
    .status--neutral { background: #f1f5f9; color: #64748b; }

    .pay-box {
      padding: 14px 16px;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.06), 0 0 0 1px #eef2f7;
    }

    .pay-box__method {
      display: flex;
      align-items: center;
      gap: 12px;
      padding-bottom: 14px;
      border-bottom: 1px solid #eef2f7;
      font-size: 14.5px;
      font-weight: 600;
    }

    .pay-box__txn {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-top: 12px;
    }

    .pay-box__label {
      font-size: 13.5px;
      color: #475569;
    }

    .pay-box__value {
      margin-top: 4px;
      font-size: 14.5px;
      font-weight: 500;
      word-break: break-all;
    }

    .copy-btn {
      width: 34px;
      height: 34px;
      flex-shrink: 0;
      padding: 0;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: #2563eb;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
    }

    .copy-btn:hover {
      background: #eef4ff;
    }

    .copy-btn mat-icon {
      font-size: 19px;
      width: 19px;
      height: 19px;
    }

    /* Items + totals */
    .items {
      overflow: hidden;
    }

    .items__head {
      display: flex;
      justify-content: space-between;
      padding: 12px 22px;
      background: #f8fafc;
      border-bottom: 1px solid #eef2f7;
      font-size: 12.5px;
      font-weight: 600;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: #475569;
    }

    .item {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin: 0 22px;
      padding: 16px 0;
      border-bottom: 1px solid #eef2f7;
      font-size: 15px;
    }

    .item__amount {
      white-space: nowrap;
      font-variant-numeric: tabular-nums;
    }

    .totals-wrap {
      position: relative;
      display: flex;
      justify-content: flex-end;
      padding: 14px 22px 18px;
    }

    .stamp {
      position: absolute;
      left: 34%;
      top: -34px;
      padding: 6px 22px;
      border: 4px double currentColor;
      border-radius: 12px;
      font-family: Georgia, 'Times New Roman', serif;
      font-size: 46px;
      font-weight: 700;
      letter-spacing: 0.06em;
      transform: rotate(-14deg);
      opacity: 0.5;
      pointer-events: none;
    }

    .stamp--success { color: #22c55e; }
    .stamp--info { color: #0ea5e9; }

    .totals {
      width: min(100%, 320px);
      margin: 0;
    }

    .totals__row,
    .totals__grand {
      display: flex;
      justify-content: space-between;
      gap: 16px;
    }

    .totals__row {
      padding: 5px 0;
      font-size: 14.5px;
      color: #334155;
    }

    .totals__row dd {
      margin: 0;
      color: #0f172a;
      font-variant-numeric: tabular-nums;
    }

    .totals__grand {
      align-items: center;
      margin-top: 8px;
      padding-top: 12px;
      border-top: 1px solid #e5eaf1;
    }

    .totals__grand dt {
      font-size: 15px;
      font-weight: 600;
    }

    .totals__grand dd {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      color: #2563eb;
      font-variant-numeric: tabular-nums;
    }

    .refund-note {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 14px;
      padding: 10px 12px;
      border-radius: 10px;
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      color: #0369a1;
      font-size: 13px;
    }

    .refund-note mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Actions */
    .inv-actions {
      display: flex;
      justify-content: flex-end;
      gap: 16px;
      margin-top: 24px;
    }

    .btn-outline,
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: var(--btn-height-lg);
      padding: 0 22px;
      border-radius: 10px;
      font: inherit;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-outline {
      min-width: 110px;
      border: 1.5px solid #2563eb;
      background: #ffffff;
      color: #2563eb;
    }

    .btn-outline:hover {
      background: #eff6ff;
    }

    .btn-primary {
      border: none;
      background: #2563eb;
      color: #ffffff;
      box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
    }

    .btn-primary:hover {
      background: #1d4ed8;
    }

    @media (max-width: 640px) {
      .invoice {
        padding: 24px 18px 20px;
      }

      .inv-head {
        flex-direction: column;
        align-items: flex-start;
      }

      .brand {
        padding-right: 0;
        border-right: none;
      }

      .doc {
        text-align: left;
      }

      .parties {
        grid-template-columns: 1fr;
      }

      .parties__divider {
        display: none;
      }

      .stamp {
        display: none;
      }
    }
  `],
})
export class InvoiceDialogComponent {
  /** App name from System Defaults → General (falls back to OneHostel). */
  readonly appName: string;
  copied = false;

  constructor(
    public dialogRef: MatDialogRef<InvoiceDialogComponent, 'download' | undefined>,
    @Inject(MAT_DIALOG_DATA) public payment: PaymentTransaction,
    settings: SystemSettingsService,
  ) {
    this.appName = settings.settings.general.applicationName || 'OneHostel';
  }

  get tone(): string {
    return statusTone(this.payment.paymentStatus);
  }

  get statusIcon(): string {
    return { Paid: 'check_circle', Refunded: 'replay', Pending: 'schedule', Failed: 'cancel' }[this.payment.paymentStatus] ?? 'info';
  }

  get methodIcon(): string {
    return { UPI: 'qr_code_2', Card: 'credit_card', 'Net Banking': 'account_balance', 'Bank Transfer': 'account_balance' }[this.payment.paymentMethod] ?? 'payments';
  }

  /** Decorative stamp beside the totals; only for settled invoices. */
  get stampLabel(): string | null {
    if (this.payment.paymentStatus === 'Paid') return 'PAID';
    if (this.payment.paymentStatus === 'Refunded') return 'REFUNDED';
    return null;
  }

  copyTxn(): void {
    navigator.clipboard?.writeText(this.payment.transactionId).then(
      () => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 1500);
      },
      () => {
        // Clipboard blocked (e.g. insecure context) — nothing to do.
      },
    );
  }
}
