interface ShortcutDef {
  key: string
  ctrl?: boolean
  shift?: boolean
  description: string
  handler: () => void
}

const shortcuts: ShortcutDef[] = []
const showHelp = ref(false)

export function useKeyboardShortcuts() {
  function register(defs: ShortcutDef[]) {
    for (const def of defs) {
      // Avoid duplicates
      const existing = shortcuts.findIndex(
        (s) => s.key === def.key && s.ctrl === def.ctrl && s.shift === def.shift,
      )
      if (existing >= 0) shortcuts[existing] = def
      else shortcuts.push(def)
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    // Don't trigger if typing in an input
    const tag = (e.target as HTMLElement)?.tagName
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) return

    for (const s of shortcuts) {
      const ctrlMatch = s.ctrl ? (e.ctrlKey || e.metaKey) : true
      const shiftMatch = s.shift ? e.shiftKey : true
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
