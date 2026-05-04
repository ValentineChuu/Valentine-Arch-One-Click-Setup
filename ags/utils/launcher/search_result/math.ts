/** Safely evaluate a basic math expression. Returns null if not a valid expression. */
export function evalMath(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Must contain at least one operator to be treated as math
  if (!/[+\-*/%^]/.test(trimmed)) return null

  // Only allow digits, operators, parentheses, dots, spaces
  if (!/^[\d+\-*/%^().\s]+$/.test(trimmed)) return null

  try {
    // Replace ^ with ** for exponentiation
    const expr = trimmed.replace(/\^/g, "**")
    const result = Function(`"use strict"; return (${expr})`)()

    if (typeof result !== "number" || !isFinite(result)) return null

    // Format: remove trailing zeros but keep reasonable precision
    return Number.isInteger(result) ? result.toString() : parseFloat(result.toFixed(10)).toString()
  } catch (_) {
    return null
  }
}