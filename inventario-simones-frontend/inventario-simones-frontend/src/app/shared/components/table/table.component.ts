import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TableColumn, TableAction, TableData } from './models/table.model';
import { StatusRentalsPipe } from '../../../features/rentals/pipes/status-rentals.pipe';

@Component({
  selector: 'app-table',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatTooltipModule,
    StatusRentalsPipe
  ],
  templateUrl: './table.component.html',
  styleUrls: ['./table.component.scss']
})
export class TableComponent {
  @Input() columns: TableColumn[] = [];
  @Input() data: TableData[] = [];
  @Input() loading: boolean = false;

  @Output() actionClicked = new EventEmitter<{action: TableAction, row: TableData}>();

  // Utility to create array for skeleton loader
  Array = Array;

  /**
   * Gets nested value from object using dot notation
   * @param obj - The object to get value from
   * @param path - The path to the value (e.g., 'user.name')
   * @returns The value or null if not found
   */
  getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return null;
    
    return path.split('.').reduce((current, property) => {
      return current && current[property] !== undefined ? current[property] : null;
    }, obj);
  }

  /**
   * Gets CSS classes for rental status
   * @param status - The rental status
   * @returns CSS classes string
   */
  getStatusClasses(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'bg-green-100 text-green-800',
      'pending': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-blue-100 text-blue-800',
      'cancelled': 'bg-red-100 text-red-800',
      'overdue': 'bg-red-100 text-red-800'
    };

    return statusClasses[status?.toLowerCase()] || 'bg-gray-100 text-gray-800';
  }

  /**
   * Handles action button clicks
   * @param action - The action that was clicked
   * @param row - The row data
   */
  onActionClick(action: TableAction, row: TableData): void {
    if (action.disabled && action.disabled(row)) {
      return;
    }
    
    this.actionClicked.emit({ action, row });
  }
}