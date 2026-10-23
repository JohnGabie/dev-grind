export function toggleSelection(selected: ReadonlySet<string>, id: string): Set<string> {
  const next = new Set(selected)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  return next
}

export function retainFailed(selected: ReadonlySet<string>, failed: string[]): Set<string> {
  return new Set(failed.filter(id => selected.has(id)))
}
