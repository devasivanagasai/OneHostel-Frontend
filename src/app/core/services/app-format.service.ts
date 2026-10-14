import { Injectable } from '@angular/core';
import { formatDate } from '@angular/common';
import { SystemSettingsService } from './system-settings.service';

/**
 * How a date is shown:
 * - 'date'            the Date Format from Settings, e.g. 13-Oct-26
 * - 'dayDate'         weekday + Date Format, e.g. Tue, 13-Oct-26 (timeline headings)
 * - 'datetime'        Date Format + time, e.g. 13-Oct-26, 4:05 PM
 * - 'datetimeSeconds' as 'datetime' with seconds (audit trail)
 * - 'time'            time only, e.g. 4:05 PM
 */
export type AppDateMode = 'date' | 'dayDate' | 'datetime' | 'datetimeSeconds' | 'time';

/** Number formatting locale per currency, so grouping looks native (₹12,34,567 vs $1,234,567). */
const CURRENCY_LOCALES: Record<string, string> = {
  INR: 'en-IN',
  AED: 'en-AE',
  GBP: 'en-GB',
  USD: 'en-US',
  SGD: 'en-SG',
};

const DEFAULT_DATE_FORMAT = 'dd-MMM-yy';

/**
 * Single place that formats money and dates for the whole app, using
 * Settings → General (Currency, Date Format, Time Zone). Values are read on
 * every call, so a saved change applies as soon as a screen re-renders.
 *
 * Amounts are not converted between currencies — only the symbol and
 * number format change.
 */
@Injectable({ providedIn: 'root' })
export class AppFormatService {
  private readonly numberFormats = new Map<string, Intl.NumberFormat>();

  constructor(private settings: SystemSettingsService) {}

  get currencyCode(): string {
    return this.settings.settings.general.currency || 'INR';
  }

  /** e.g. "₹" for INR, "$" for USD. */
  get currencySymbol(): string {
    const part = this.numberFormat(0, 0).formatToParts(0).find((p) => p.type === 'currency');
    return part?.value ?? this.currencyCode;
  }

  get dateFormat(): string {
    return this.settings.settings.general.dateFormat || DEFAULT_DATE_FORMAT;
  }

  get timeZone(): string {
    return this.settings.settings.general.timeZone;
  }

  /**
   * Formats an amount in the configured currency.
   * `digits` is either a fixed number of decimals or an Angular digitsInfo string like '1.2-2'.
   */
  money(value: number | null | undefined, digits: number | string = '1.2-2'): string {
    if (value === null || value === undefined || isNaN(Number(value))) return '';
    const [min, max] = typeof digits === 'number' ? [digits, digits] : parseDigits(digits);
    return this.numberFormat(min, max).format(Number(value));
  }

  date(value: Date | string | number | null | undefined, mode: AppDateMode = 'date'): string {
    if (value === null || value === undefined || value === '') return '';
    const format = this.formatFor(mode);
    // Only values with a time of day are shifted into the configured time zone; a plain
    // calendar date (e.g. a check-in date) must never move to the previous/next day.
    const timezone = mode === 'date' || mode === 'dayDate' ? undefined : this.offsetAt(value);
    try {
      return formatDate(value, format, 'en-US', timezone);
    } catch {
      return String(value);
    }
  }

  private formatFor(mode: AppDateMode): string {
    switch (mode) {
      case 'dayDate':
        return `EEE, ${this.dateFormat}`;
      case 'datetime':
        return `${this.dateFormat}, h:mm a`;
      case 'datetimeSeconds':
        return `${this.dateFormat}, h:mm:ss a`;
      case 'time':
        return 'h:mm a';
      default:
        return this.dateFormat;
    }
  }

  /**
   * Angular's formatDate takes an offset like "+0530", not an IANA zone name, so the
   * offset is worked out for the moment being shown (correct across daylight saving).
   */
  private offsetAt(value: Date | string | number): string | undefined {
    const zone = this.timeZone;
    const at = value instanceof Date ? value : new Date(value);
    if (!zone || isNaN(at.getTime())) return undefined;
    try {
      const name =
        new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' })
          .formatToParts(at)
          .find((p) => p.type === 'timeZoneName')?.value ?? '';
      const m = /GMT([+-])(\d{2}):?(\d{2})/.exec(name);
      return m ? `${m[1]}${m[2]}${m[3]}` : '+0000'; // plain "GMT" means UTC
    } catch {
      return undefined; // unknown zone: fall back to the browser's own time zone
    }
  }

  private numberFormat(min: number, max: number): Intl.NumberFormat {
    const code = this.currencyCode;
    const key = `${code}|${min}|${max}`;
    let format = this.numberFormats.get(key);
    if (!format) {
      format = new Intl.NumberFormat(CURRENCY_LOCALES[code] ?? 'en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: min,
        maximumFractionDigits: max,
      });
      this.numberFormats.set(key, format);
    }
    return format;
  }
}

/** '1.2-2' → [2, 2]; '1.0-0' → [0, 0]. */
function parseDigits(info: string): [number, number] {
  const m = /^\d+\.(\d+)-(\d+)$/.exec(info);
  return m ? [Number(m[1]), Number(m[2])] : [2, 2];
}
