<script setup>
// Chronomètre simple pour les examens blancs (8h en conditions réelles).
// Pas de cycles, juste un compteur up persistant.

import { onUnmounted, ref, watch, computed } from 'vue'
import { formatMMSS } from '../lib/pomodoro.js'

const props = defineProps({
  session: { type: Object, required: true },
})

const LS_KEY = `opj-planning-stopwatch-${props.session.id}`

const persisted = ref(loadPersisted())
const now = ref(Date.now())

let tickerId = null

function loadPersisted () {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

function save () {
  try {
    if (persisted.value) localStorage.setItem(LS_KEY, JSON.stringify(persisted.value))
    else localStorage.removeItem(LS_KEY)
  } catch {}
}

const elapsedSec = computed(() => {
  if (!persisted.value) return 0
  const { startedAt, pausedAt, totalPausedMs } = persisted.value
  const end = pausedAt || now.value
  return Math.floor((end - startedAt - (totalPausedMs || 0)) / 1000)
})

function display (sec) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function start () {
  persisted.value = { startedAt: Date.now(), pausedAt: null, totalPausedMs: 0 }
  save()
}
function pause () {
  if (!persisted.value || persisted.value.pausedAt) return
  persisted.value = { ...persisted.value, pausedAt: Date.now() }
  save()
}
function resume () {
  if (!persisted.value?.pausedAt) return
  const pausedFor = Date.now() - persisted.value.pausedAt
  persisted.value = {
    ...persisted.value,
    pausedAt: null,
    totalPausedMs: (persisted.value.totalPausedMs || 0) + pausedFor,
  }
  save()
}
function reset () {
  persisted.value = null
  save()
}

watch(
  () => persisted.value && !persisted.value.pausedAt,
  (running) => {
    if (running && !tickerId) {
      tickerId = setInterval(() => { now.value = Date.now() }, 1000)
    } else if (!running && tickerId) {
      clearInterval(tickerId); tickerId = null
    }
  },
  { immediate: true }
)

onUnmounted(() => { if (tickerId) clearInterval(tickerId) })
</script>

<template>
  <div class="stopwatch">
    <div class="stopwatch-time">{{ display(elapsedSec) }}</div>
    <div class="row" style="gap: 6px">
      <button v-if="!persisted" class="primary" @click="start">▶ Lancer le chrono</button>
      <template v-else>
        <button @click="persisted.pausedAt ? resume() : pause()">
          {{ persisted.pausedAt ? '▶ Reprendre' : '⏸ Pause' }}
        </button>
        <button class="ghost danger" @click="reset">⏹ Reset</button>
      </template>
    </div>
  </div>
</template>

<style scoped>
.stopwatch {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}
.stopwatch-time {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 1.6rem;
  font-weight: 600;
  color: var(--mock);
}
</style>
