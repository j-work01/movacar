import {
  Check,
  Columns3,
  Download,
  ExternalLink,
  FunnelX,
  Info,
  Menu,
  RefreshCw,
  Share2,
  WrapText,
  type LucideIcon,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import type { ReactNode } from 'react'
import { REFRESH_URL, REPO_URL } from '../links.ts'

const item =
  'flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-sm outline-none select-none data-[disabled]:cursor-default data-[disabled]:opacity-40 data-[highlighted]:bg-zinc-100 dark:data-[highlighted]:bg-zinc-800'

function Label({
  icon: Icon,
  children,
}: {
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <>
      <Icon aria-hidden className="size-4 shrink-0 text-zinc-500" />
      <span className="flex-1">{children}</span>
    </>
  )
}

function LinkItem({
  href,
  icon,
  children,
}: {
  href: string
  icon: LucideIcon
  children: ReactNode
}) {
  return (
    <DropdownMenu.Item asChild className={item}>
      <a href={href} target="_blank" rel="noreferrer">
        <Label icon={icon}>{children}</Label>
        <ExternalLink aria-hidden className="size-3.5 text-zinc-400" />
      </a>
    </DropdownMenu.Item>
  )
}

/** The ☰ menu: actions that would clutter the screen, especially on a phone. */
export function AppMenu({
  onColumns,
  wrap,
  onWrapChange,
  onShare,
  onClearFilters,
  canClearFilters,
  onExport,
  canExport,
}: {
  onColumns: () => void
  wrap: boolean
  onWrapChange: (wrap: boolean) => void
  onShare: () => void
  onClearFilters: () => void
  canClearFilters: boolean
  onExport: () => void
  canExport: boolean
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        aria-label="Menu"
        className="rounded-md p-2 hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-blue-600 data-[state=open]:bg-zinc-100 dark:hover:bg-zinc-800 dark:data-[state=open]:bg-zinc-800"
      >
        <Menu aria-hidden className="size-5" />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-30 min-w-60 rounded-lg border border-zinc-200 bg-white p-1 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <DropdownMenu.Item className={item} onSelect={onColumns}>
            <Label icon={Columns3}>Columns…</Label>
          </DropdownMenu.Item>
          <DropdownMenu.CheckboxItem
            className={item}
            checked={wrap}
            onCheckedChange={onWrapChange}
          >
            <Label icon={WrapText}>Wrap text</Label>
            <DropdownMenu.ItemIndicator>
              <Check aria-hidden className="size-4 text-blue-700" />
            </DropdownMenu.ItemIndicator>
          </DropdownMenu.CheckboxItem>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <DropdownMenu.Item className={item} onSelect={onShare}>
            <Label icon={Share2}>Share this view</Label>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={onClearFilters}
            disabled={!canClearFilters}
          >
            <Label icon={FunnelX}>Clear filters</Label>
          </DropdownMenu.Item>
          <DropdownMenu.Item
            className={item}
            onSelect={onExport}
            disabled={!canExport}
          >
            <Label icon={Download}>Export CSV</Label>
          </DropdownMenu.Item>
          <DropdownMenu.Separator className="my-1 h-px bg-zinc-200 dark:bg-zinc-700" />
          <LinkItem href={REFRESH_URL} icon={RefreshCw}>
            Refresh data (on GitHub)
          </LinkItem>
          <LinkItem href={REPO_URL} icon={Info}>
            About this board
          </LinkItem>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
