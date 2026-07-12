import { ReactNode } from 'react'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface Column<T> {
  key: string
  header: string
  render?: (row: T) => ReactNode
  className?: string
}

interface TableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (row: T) => string
  loading?: boolean
  empty?: ReactNode
  onRowClick?: (row: T) => void
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function Table<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  empty,
  onRowClick,
}: TableProps<T>) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-[#E2E8F0]">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-left text-xs font-semibold text-[#64748B] uppercase tracking-wider
                  ${col.className ?? ''}
                `}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center">
                <span className="text-[#64748B] text-sm">Carregando...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                {empty ?? (
                  <span className="text-[#64748B] text-sm">
                    Nenhum item encontrado.
                  </span>
                )}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={keyExtractor(row)}
                onClick={() => onRowClick?.(row)}
                className={`
                  border-b border-[#E2E8F0] last:border-0 bg-white
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-[#F8FAFC]' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-[#1E293B] text-sm ${col.className ?? ''}`}
                  >
                    {col.render
                      ? col.render(row)
                      : (row as Record<string, unknown>)[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
