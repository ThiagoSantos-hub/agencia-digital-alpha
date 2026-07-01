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
    <div className="w-full overflow-x-auto rounded-2xl border border-[#2a2a2a]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#2a2a2a]">
            {columns.map((col) => (
              <th
                key={col.key}
                className={`
                  px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider
                  bg-[#111] first:rounded-tl-2xl last:rounded-tr-2xl
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
                <span className="text-gray-500 text-sm">Carregando...</span>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-10 text-center">
                {empty ?? (
                  <span className="text-gray-500 text-sm">
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
                  border-b border-[#1f1f1f] last:border-0 bg-[#1a1a1a]
                  transition-colors
                  ${onRowClick ? 'cursor-pointer hover:bg-[#222]' : ''}
                `}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-gray-300 ${col.className ?? ''}`}
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
