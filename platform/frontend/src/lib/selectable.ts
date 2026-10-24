import type { CSSProperties, HTMLAttributes, KeyboardEvent } from 'react'

interface Options {
  title: string
  selectMode: boolean
  selected: boolean
  onToggle?: () => void
  onOpen: () => void
}

export function selectableProps({ title, selectMode, selected, onToggle, onOpen }: Options): { props: HTMLAttributes<HTMLDivElement>; style: CSSProperties } {
  if (!selectMode) return { props: { onClick: onOpen }, style: {} }
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== ' ' || event.target !== event.currentTarget) return
    event.preventDefault()
    onToggle?.()
  }
  return {
    props: { onClick: onToggle, onKeyDown, role: 'checkbox', 'aria-checked': selected, 'aria-label': title, tabIndex: 0 },
    style: { position: 'relative', boxShadow: selected ? '0 0 0 2px var(--red)' : undefined },
  }
}

export const selectModeInert: CSSProperties = { pointerEvents: 'none' }

export interface SelectProps {
  selectMode?: boolean
  selected?: boolean
  onToggle?: () => void
}
