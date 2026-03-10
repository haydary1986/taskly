interface ShortcutDef {
  key: string
  ctrl?: boolean
  shift?: boolean
  description: string
  handler: () => void
}

export function useKeyboardShortcuts() {
  const shortcuts = useState<ShortcutDef[]>('taskly_shortcuts', () => [])
  const showHelp = useState('taskly_shortcuts_help', () => false)

  function register(defs: ShortcutDef[]) {
    for (const def of defs) {
      // Avoid duplicates
      const existing = shortcuts.value.findIndex(
        (s) => s.key === def.key && s.ctrl === def.ctrl && s.shift === def.shift,
      )
      if (existing >= 0) shortcuts.value[existing] = def
      else shortcuts.value.push(def)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Don't trigger if typing in an input
    const tag = (e.target as HTMLElement)?.tagName
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

    for (const s of shortcuts.value) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : !e.ctrlKey && !e.metaKey
      const shiftMatch = s.shift ? e.shiftKey : !e.shiftKey
      if (e.key.toLowerCase() === s.key.toLowerCase() && ctrlMatch && shiftMatch) {
        e.preventDefault()
        s.handler()
        return
      }
    }

    // ? to show help
    if (e.key === '?' && !e.ctrlKey) {
      showHelp.value = !showHelp.value
    }
  }

  onMounted(() => {
    if (import.meta.client) {
      window.addEventListener('keydown', handleKeydown)
    }
  })

  onUnmounted(() => {
    if (import.meta.client) {
      window.removeEventListener('keydown', handleKeydown)
    }
  })

  return { register, shortcuts, showHelp }
}
