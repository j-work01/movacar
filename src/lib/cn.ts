import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Joins Tailwind classes; later ones win when they conflict. */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
