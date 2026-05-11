/**
 * PDF export — uses browser's native print dialog against print-only CSS.
 * The user picks "Save as PDF" from the system print sheet.
 */

export function printSchedule(): void {
  if (typeof window === 'undefined') return
  // Mark body so we could add extra styles if needed
  document.body.classList.add('is-printing')
  // Small delay to allow paint
  requestAnimationFrame(() => {
    window.print()
    document.body.classList.remove('is-printing')
  })
}
