import { Pipe, PipeTransform } from '@angular/core';
import { AppDateMode, AppFormatService } from '../../core/services/app-format.service';

/**
 * Formats a date with the Date Format and Time Zone chosen in Settings → General.
 *
 * Usage: {{ d | appDate }}  ·  {{ d | appDate: 'datetime' }}  ·  {{ d | appDate: 'time' }}
 */
@Pipe({ name: 'appDate', standalone: true })
export class AppDatePipe implements PipeTransform {
  constructor(private format: AppFormatService) {}

  transform(value: Date | string | number | null | undefined, mode: AppDateMode = 'date'): string {
    return this.format.date(value, mode);
  }
}
