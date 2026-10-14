import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/**
 * Standard list footer: prev / numbered / next page buttons and a rows-per-page select.
 * Styling comes from src/styles/_table.scss (`.saas-card__footer`, `.pag-*`).
 *
 *   <app-pagination [page]="safePage" [totalPages]="totalPages" [pageSize]="pageSize"
 *                   (pageChange)="setPage($event)" (pageSizeChange)="pageSize = $event; setPage(0)">
 *   Optional: [showFirstLast]="true" adds first / last buttons.
 *     <span>Optional left-hand content, e.g. "Showing 1–10 of 42"</span>
 *   </app-pagination>
 *
 * `page` is 0-based. The parent owns the current page and slices its own rows;
 * this component only renders the controls and reports which page was picked.
 */
@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [MatIconModule],
  template: `
    <div class="saas-card__footer">
      <ng-content></ng-content>
      <nav class="pagination-right" aria-label="Pagination">
        <div class="pag-arrows">
          @if (showFirstLast) {
            <button type="button" class="pag-btn" aria-label="First page" [disabled]="isFirst" (click)="go(0)">
              <mat-icon>first_page</mat-icon>
            </button>
          }
          <button type="button" class="pag-btn" aria-label="Previous page" [disabled]="isFirst" (click)="go(page - 1)">
            <mat-icon>chevron_left</mat-icon>
          </button>
          @for (n of pageNumbers; track n) {
            <button
              type="button"
              class="pag-number"
              [class.pag-number--active]="n === page + 1"
              [attr.aria-current]="n === page + 1 ? 'page' : null"
              [attr.aria-label]="'Page ' + n"
              (click)="go(n - 1)"
            >
              {{ n }}
            </button>
          }
          <button type="button" class="pag-btn" aria-label="Next page" [disabled]="isLast" (click)="go(page + 1)">
            <mat-icon>chevron_right</mat-icon>
          </button>
          @if (showFirstLast) {
            <button type="button" class="pag-btn" aria-label="Last page" [disabled]="isLast" (click)="go(totalPages - 1)">
              <mat-icon>last_page</mat-icon>
            </button>
          }
        </div>
        @if (pageSize) {
          <select
            class="pag-size"
            aria-label="Rows per page"
            [value]="pageSize"
            (change)="pageSizeChange.emit(+$any($event.target).value)"
          >
            @for (size of pageSizeOptions; track size) {
              <option [value]="size" [selected]="size === pageSize">{{ size }}</option>
            }
          </select>
        }
      </nav>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `],
})
export class AppPaginationComponent {
  /** Current page, 0-based. */
  @Input() page = 0;
  /** Total number of pages (at least 1). */
  @Input() totalPages = 1;
  /** Emits the 0-based page the user picked. */
  @Output() pageChange = new EventEmitter<number>();
  /** Show the first / last page buttons (off by default). */
  @Input() showFirstLast = false;
  /** When set, a rows-per-page selector (10 / 25 / 50) is shown; the parent owns the value. */
  @Input() pageSize?: number;
  @Input() pageSizeOptions: number[] = [10, 25, 50];
  @Output() pageSizeChange = new EventEmitter<number>();

  get pageNumbers(): number[] {
    return Array.from({ length: Math.max(1, this.totalPages) }, (_, i) => i + 1);
  }

  get isFirst(): boolean {
    return this.page <= 0;
  }

  get isLast(): boolean {
    return this.page >= this.totalPages - 1;
  }

  go(page: number): void {
    const clamped = Math.min(Math.max(0, page), Math.max(0, this.totalPages - 1));
    if (clamped !== this.page) this.pageChange.emit(clamped);
  }
}
