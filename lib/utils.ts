import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to create page URLs
export function createPageUrl(path: string): string {
  return `/${path.toLowerCase()}`
}
