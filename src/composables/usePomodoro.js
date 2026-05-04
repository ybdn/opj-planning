// Composable Vue : timer pomodoro réactif, partagé entre composants.
// Un seul timer actif à la fois (lié à une sessionId).

import { reactive, computed, onUnmounted, watch } from 'vue'
import { computePomodoroState, beep, formatMMSS } from '../lib/pomodoro.js'

const LS_KEY = 'opj-planning-pomodoro'

const state = reactive({
  persisted: loadPersisted(), // { sessionId, startedAt, pausedAt, totalPausedMs, hours } | null
  nowMs: Date.now(),
})

let tickerId = null
let lastCycleIndex = -1
let notifPermission = null

function loadPersisted () {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function savePersisted () {
  try {
    if (state.persisted) localStorage.setItem(LS_KEY, JSON.stringify(state.persisted))
    else localStorage.removeItem(LS_KEY)
  } catch {}
}

function startTicker () {
  if (tickerId) return
  tickerId = setInterval(() => {
    state.nowMs = Date.now()
  }, 1000)
}

function stopTicker () {
  if (tickerId) clearInterval(tickerId)
  tickerId = null
}

// Démarre l'horloge dès qu'un timer est actif
watch(
  () => state.persisted,
  (p) => {
    if (p && !p.pausedAt) startTicker()
    else stopTicker()
  },
  { immediate: true }
)

// Détecte les transitions de cycle pour bipper et notifier
watch(
  () => state.nowMs,
  () => {
    if (!state.persisted || state.persisted.pausedAt) return
    const s = computePomodoroState(state.persisted, state.nowMs)
    if (!s) return
    if (s.finished) {
      if (lastCycleIndex !== -2) {
        beep('work-end')
        notify('Session terminée', 'Tu peux marquer la session comme faite.')
        lastCycleIndex = -2
      }
      return
    }
    if (lastCycleIndex !== s.cycleIndex && lastCycleIndex >= 0) {
      const prev = s.cycles[lastCycleIndex]
      if (prev) {
        beep(prev.kind === 'work' ? 'work-end' : 'break-end')
        notify(
          prev.kind === 'work' ? 'Pause !' : 'On reprend',
          s.cycle.label
        )
      }
    }
    lastCycleIndex = s.cycleIndex
  }
)

function notify (title, body) {
  if (notifPermission !== 'granted') return
  if (!document.hidden) return
  try {
    new Notification(title, { body, silent: true })
  } catch {}
}

async function requestNotificationPermission () {
  if (!('Notification' in window)) return
  if (Notification.permission === 'default') {
    notifPermission = await Notification.requestPermission()
  } else {
    notifPermission = Notification.permission
  }
}

export function usePomodoro () {
  const status = computed(() => computePomodoroState(state.persisted, state.nowMs))

  const isFor = (sessionId) => state.persisted?.sessionId === sessionId

  function start (sessionId, hours) {
    requestNotificationPermission()
    lastCycleIndex = 0
    state.persisted = {
      sessionId,
      startedAt: Date.now(),
      pausedAt: null,
      totalPausedMs: 0,
      hours,
    }
    savePersisted()
  }

  function pause () {
    if (!state.persisted || state.persisted.pausedAt) return
    state.persisted = { ...state.persisted, pausedAt: Date.now() }
    savePersisted()
  }

  function resume () {
    if (!state.persisted || !state.persisted.pausedAt) return
    const pausedFor = Date.now() - state.persisted.pausedAt
    state.persisted = {
      ...state.persisted,
      pausedAt: null,
      totalPausedMs: (state.persisted.totalPausedMs || 0) + pausedFor,
    }
    savePersisted()
  }

  function stop () {
    state.persisted = null
    lastCycleIndex = -1
    savePersisted()
  }

  function skipCycle () {
    // Avance "manuellement" en réduisant totalPausedMs (subtilité : on simule
    // que le temps a passé en plus en réduisant les pauses cumulées).
    if (!state.persisted) return
    const s = status.value
    if (!s || s.finished) return
    state.persisted = {
      ...state.persisted,
      totalPausedMs: (state.persisted.totalPausedMs || 0) - s.secondsLeftInCycle * 1000,
    }
    savePersisted()
  }

  return {
    status,
    isFor,
    start,
    pause,
    resume,
    stop,
    skipCycle,
    formatMMSS,
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', stopTicker)
}
