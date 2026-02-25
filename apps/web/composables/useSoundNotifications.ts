const STORAGE_KEY = 'taskly_sound_enabled'

const soundEnabled = ref(true)

export function useSoundNotifications() {
  if (import.meta.client) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) soundEnabled.value = stored === 'true'
  }

  function toggle() {
    soundEnabled.value = !soundEnabled.value
    if (import.meta.client) {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled.value))
    }
  }

  function playNotification() {
    if (!soundEnabled.value || !import.meta.client) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 800
      gain.gain.value = 0.1
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
      osc.stop(ctx.currentTime + 0.3)
    } catch { /* ignore audio errors */ }
  }

  function playMessage() {
    if (!soundEnabled.value || !import.meta.client) return
    try {
      const ctx = new AudioContext()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 600
      osc.type = 'sine'
      gain.gain.value = 0.08
      osc.start()
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2)
      osc.stop(ctx.currentTime + 0.2)
    } catch { /* ignore audio errors */ }
  }

  return { soundEnabled: readonly(soundEnabled), toggle, playNotification, playMessage }
}
