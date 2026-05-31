/**
 * Utility function to combine classNames
 * Used with clsx and tailwind-merge for conditional CSS classes
 */
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}
