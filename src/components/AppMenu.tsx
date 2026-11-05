import {
  Check,
  CircleDot,
  Columns3,
  Download,
  ExternalLink,
  FunnelX,
  Info,
  Map as MapIcon,
  Menu,
  RefreshCw,
  Share2,
  WrapText,
  type LucideIcon,
} from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import type { ReactNode } from 'react'
import { REFRESH_URL, REPO_URL } from '../links.ts'
import {
  GROUP_SIZES,
  groupName,
  MAP_SIZES,
  mapSizeName,
  type GroupKm,
  type MapSize,
} from '../map/settings.ts'

const panel =
  'z-30 rounded-lg border border-zinc-200 bg-white p-1 text-zinc-900 shadow-lg dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100'

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

/** A setting as one row of small buttons, which fits a phone. */
function ChoiceRow({
  icon: Icon,
  label,
  unit,
  values,
  value,
  onChange,
  nameOf,
}: {
  icon: LucideIcon
  label: string
  unit: string
  values: readonly number[]
  value: number
  onChange: (value: number) => void
  /** For screen readers: what a button means. */
  nameOf: (value: number) => string
}) {
  return (
    <>
      <DropdownMenu.Label className="flex items-center gap-2.5 px-2.5 pt-2 pb-1.5 text-sm">
        <Icon aria-hidden className="size-4 shrink-0 text-zinc-500" />
        <span className="flex-1">{label}</span>
        <span className="text-xs text-zinc-500">{unit}</span>
      </DropdownMenu.Label>
      <DropdownMenu.RadioGroup
        value={String(value)}
        onValueChange={(choice) => onChange(Number(choice))}
        className="flex gap-1 px-2 pb-1.5"
      >
        {values.map((choice) => (
          <DropdownMenu.RadioItem
            key={choice}
            value={String(choice)}
            aria-label={nameOf(choice)}
            className="flex-1 cursor-pointer rounded-md border border-zinc-200 py-1.5 text-center text-xs outline-none select-none data-[highlighted]:bg-zinc-100 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-50 data-[state=checked]:font-semibold data-[state=checked]:text-blue-800 dark:border-zinc-700 dark:data-[highlighted]:bg-zinc-800 dark:data-[state=checked]:border-blue-400 dark:data-[state=checked]:bg-blue-950 dark:data-[state=checked]:text-blue-200"
          >
            {choice === 0 ? 'Off' : choice}
          </DropdownMenu.RadioItem>
        ))}
      </DropdownMenu.RadioGroup>
    </>
  )
}

/** The ☰ menu: actions that would clutter the screen, especially on a phone. */
export function AppMenu({
  onColumns,
  wrap,
  onWrapChange,
  mapSize,
  onMapSizeChange,
  groupKm,
  onGroupKmChange,
  onShare,
  onClearFilters,
  canClearFilters,
  onExport,
  canExport,
}: {
  onColumns: () => void
  wrap: boolean
  onWrapChange: (wrap: boolean) => void
  mapSize: MapSize
  onMapSizeChange: (size: MapSize) => void
  groupKm: GroupKm
  onGroupKmChange: (km: GroupKm) => void
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
          className={`${panel} min-w-60`}
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
          <ChoiceRow
            icon={MapIcon}
            label="Map"
            unit="% of the screen"
            values={MAP_SIZES}
            value={mapSize}
            onChange={(size) => onMapSizeChange(size as MapSize)}
            nameOf={(size) => mapSizeName(size as MapSize)}
          />
          <ChoiceRow
            icon={CircleDot}
            label="Group places on the map"
            unit="km"
            values={GROUP_SIZES}
            value={groupKm}
            onChange={(km) => onGroupKmChange(km as GroupKm)}
            nameOf={(km) => groupName(km as GroupKm)}
          />
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
