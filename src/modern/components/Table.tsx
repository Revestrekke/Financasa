import type { ReactNode } from 'react';

export interface TableColumn<Row> {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
}

interface TableProps<Row> {
  columns: TableColumn<Row>[];
  empty?: ReactNode;
  rows: Row[];
}

export function Table<Row>({ columns, empty, rows }: TableProps<Row>) {
  if (!rows.length) return <>{empty}</>;

  return (
    <div className="fc-table-wrap">
      <table className="fc-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              {columns.map((column) => (
                <td key={column.key}>{column.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
