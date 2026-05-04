<script setup>
import { computed } from 'vue'
import { usePomodoro } from '../composables/usePomodoro.js'

const props = defineProps({
  session: { type: Object, required: true },
  hours: { type: Number, default: 2 },
})

const { status, isFor, start, pause, resume, stop, skipCycle, formatMMSS } = usePomodoro()

const active = computed(() => isFor(props.session.id) && status.value)
const otherActive = computed(() => status.value && !isFor(props.session.id))

const cycleColor = computed(() => {
  if (!active.value) return null
  return active.value.cycle?.kind === 'work' ? 'work' : 'break'
})

function onStart () {
  start(props.session.id, props.hours)
}

function onToggle () {
  if (active.value?.paused) resume()
  else pause()
}
</script>

<template>
  <div class="pomodoro" :class="cycleColor">
    <template v-if="!active">
      <div v-if="otherActive" class="muted" style="font-size: 0.85em">
        Un timer est déjà actif sur une autre session.
      </div>
      <button class="primary" @click="onStart">▶ Démarrer pomodoro</button>
    </template>

    <template v-else>
      <div class="pomodoro-header">
        <div>
          <div class="pomodoro-label">{{ active.cycle.label }}</div>
          <div class="pomodoro-meta muted">
            Total restant {{ formatMMSS(active.secondsLeftTotal) }}
            <span v-if="active.paused"> · ⏸ en pause</span>
            <span v-else-if="active.finished"> · ✓ terminé</span>
          </div>
        </div>
        <div class="pomodoro-time">
          {{ active.finished ? '00:00' : formatMMSS(active.secondsLeftInCycle) }}
        </div>
      </div>

      <div class="pomodoro-bar">
        <div
          :style="{
            width: ((active.elapsedSec / active.totalSeconds) * 100) + '%',
          }"
        />
      </div>

      <div class="row" style="margin-top: 8px; gap: 6px">
        <button v-if="!active.finished" @click="onToggle">
          {{ active.paused ? '▶ Reprendre' : '⏸ Pause' }}
        </button>
        <button v-if="!active.finished" class="ghost" @click="skipCycle">⏭ Cycle suivant</button>
        <button class="ghost danger" @click="stop">⏹ Arrêter</button>
      </div>
    </template>
  </div>
</template>

<style scoped>
.pomodoro {
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg-elev-2);
  border: 1px solid var(--border);
}
.pomodoro.work { border-color: var(--accent-dim); }
.pomodoro.break { border-color: var(--ok); }
.pomodoro-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.pomodoro-label { font-weight: 600; }
.pomodoro-meta { font-size: 0.78em; margin-top: 2px; }
.pomodoro-time {
  font-family: 'SF Mono', Menlo, monospace;
  font-size: 1.6rem;
  font-weight: 600;
  letter-spacing: 0.02em;
}
.pomodoro.work .pomodoro-time { color: var(--accent); }
.pomodoro.break .pomodoro-time { color: var(--ok); }
.pomodoro-bar {
  height: 6px;
  background: var(--bg);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 8px;
}
.pomodoro-bar > div {
  height: 100%;
  background: var(--accent);
  transition: width 1s linear;
}
.pomodoro.break .pomodoro-bar > div { background: var(--ok); }
</style>
