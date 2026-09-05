/** Tiny className combiner (avoids a clsx dep inside the kit). */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
export default cx
