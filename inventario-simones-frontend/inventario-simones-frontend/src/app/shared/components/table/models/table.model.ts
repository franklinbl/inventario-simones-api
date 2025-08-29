export interface TableColumn {
  key: string;
  label: string;
  type: 'text' | 'date' | 'currency' | 'rentalStatus' | 'action';
  actions?: TableAction[];
}

export interface TableAction {
  icon: string;
  tooltip?: string;
  disabled?: (row: any) => boolean;
  action: string;
}

export interface TableData {
  [key: string]: any;
}

export type TableColumnType = 'text' | 'date' | 'currency' | 'rentalStatus' | 'action';