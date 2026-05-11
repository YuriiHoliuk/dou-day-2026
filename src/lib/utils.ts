import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Ukrainian plural: pick the matching form for `n`.
 * forms = [one, few (2-4), many (0, 5+, and teens 11-14)].
 * Example: plural(n, ['доповідь', 'доповіді', 'доповідей'])
 */
export function plural(n: number, forms: [string, string, string]): string {
  const abs = Math.abs(n) % 100
  const n1 = abs % 10
  if (abs > 10 && abs < 20) return forms[2]
  if (n1 > 1 && n1 < 5) return forms[1]
  if (n1 === 1) return forms[0]
  return forms[2]
}
