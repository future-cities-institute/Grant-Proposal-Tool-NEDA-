import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
