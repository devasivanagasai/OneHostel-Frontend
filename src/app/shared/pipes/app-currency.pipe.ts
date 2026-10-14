import { Pipe, PipeTransform } from '@angular/core';
import { AppFormatService } from '../../core/services/app-format.service';

/**
 * Formats an amount in the currency chosen in Settings → General.
 *
 * Usage: {{ amount | appCurrency }}  ·  {{ amount | appCurrency: '1.0-0' }}  ·  {{ amount | appCurrency: 2 }}
 */
@Pipe({ name: 'appCurrency', standalone: true })
export class AppCurrencyPipe implements PipeTransform {
  constructor(private format: AppFormatService) {}

  transform(value: number | null | undefined, digits: number | string = '1.2-2'): string {
    return this.format.money(value, digits);
  }
}
