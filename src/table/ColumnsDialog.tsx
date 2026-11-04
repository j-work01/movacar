import { X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { COLUMN_BY_ID } from './columns.tsx'
import type { OffersTableInstance } from './useOffersTable.ts'

const button =
  'rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-600 dark:border-zinc-700 dark:hover:bg-zinc-800'

export function ColumnsDialog({
  open,
  onOpenChange,
  table,
  onShowAll,
  onReset,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: OffersTableInstance
  onShowAll: () => void
  onReset: () => void
}) {
  const columns = table
    .getAllLeafColumns()
    .filter((column) => column.getCanHide())

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content className="fixed inset-x-4 top-1/2 z-50 mx-auto flex max-h-[85dvh] max-w-md -translate-y-1/2 flex-col rounded-xl bg-white text-zinc-900 shadow-xl focus:outline-none dark:bg-zinc-900 dark:text-zinc-100">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <Dialog.Title className="font-semibold">Columns</Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="rounded p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X aria-hidden className="size-5" />
            </Dialog.Close>
          </div>
          <Dialog.Description className="px-4 pt-3 text-sm text-zinc-600 dark:text-zinc-400">
            Choose the columns to show. This device remembers your choice.
          </Dialog.Description>
          <ul className="grid grid-cols-2 gap-x-4 overflow-y-auto px-4 py-2">
            {columns.map((column) => (
              <li key={column.id}>
                <label className="flex cursor-pointer items-center gap-2 py-1.5 text-sm">
                  <input
                    type="checkbox"
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                    className="size-4 accent-blue-700"
                  />
                  {COLUMN_BY_ID.get(column.id)?.label ?? column.id}
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2 border-t border-zinc-200 px-4 py-3 dark:border-zinc-800">
            <button type="button" className={button} onClick={onShowAll}>
              Show all
            </button>
            <button type="button" className={button} onClick={onReset}>
              Reset to default
            </button>
            <Dialog.Close
              className={`${button} ml-auto border-blue-700 bg-blue-700 text-white hover:bg-blue-800 dark:border-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700`}
            >
              Done
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
