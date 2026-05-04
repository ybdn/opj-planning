<script setup>
import { computed } from 'vue'
import { useStore } from '../composables/useStore.js'
import { formatHuman } from '../lib/util.js'
import { PHASE_GUIDE, buildSessionPlan, splitTechnique } from '../lib/pomodoro.js'
import PomodoroTimer from './PomodoroTimer.vue'
import MockStopwatch from './MockStopwatch.vue'

const props = defineProps({
  session: { type: Object, required: true },
  today: { type: Boolean, default: false },
})

const { activeExam, toggleSession, toggleMaterial } = useStore()

const sessionHours = computed(() => activeExam.value?.availability.sessionHours || 2)

const items = computed(() => {
  const exam = activeExam.value
  if (!exam) return []
  return props.session.materialIds
    .map((id) => exam.materials.find((m) => m.id === id))
    .filter(Boolean)
})

const guide = computed(() => PHASE_GUIDE[props.session.phase] || null)

const cyclePlan = computed(() => {
  if (props.session.type !== 'study') return null
  const exam = activeExam.value
  if (!exam) return null
  return buildSessionPlan(props.session, exam.materials, sessionHours.value)
})
</script>

<template>
  <div
    class="card session"
    :class="{ done: session.done, today: today }"
  >
    <div class="session-header">
      <div>
        <span class="session-date">{{ formatHuman(session.date) }}</span>
        <span class="muted" style="margin-left: 8px">
          {{ session.type === 'mock' ? '8h' : sessionHours + 'h' }}
        </span>
      </div>
      <span
        class="tag"
        :class="session.type === 'mock' ? 'type-mock' : 'phase-' + session.phase"
      >
        {{ guide?.title || session.phase }}
      </span>
    </div>

    <!-- Bandeau d'objectif de phase : guidage pédagogique -->
    <div v-if="guide && !session.done" class="phase-guide" :class="'phase-' + session.phase">
      <div class="phase-guide-intent">{{ guide.intent }}</div>
      <div class="phase-guide-method">{{ guide.method }}</div>
    </div>

    <div v-if="session.type === 'mock'" class="muted" style="margin-top: 8px">
      Journée d'examen blanc en conditions réelles. À toi de jouer.
    </div>

    <ul v-else class="session-items">
      <li v-for="m in items" :key="m.id" :class="{ done: m.done }">
        <input
          type="checkbox"
          :checked="m.done"
          @change="toggleMaterial(m.id)"
        />
        <span class="label">{{ m.name }}</span>
        <span class="tag" :class="'charge-' + m.charge">{{ m.charge }}</span>
      </li>
      <li v-if="items.length === 0" class="muted">— rien d'assigné —</li>
    </ul>

    <!-- Plan détaillé des cycles : ce qu'il faut faire à chaque pomodoro -->
    <details
      v-if="cyclePlan && items.length > 0 && !session.done"
      class="cycle-plan"
    >
      <summary>Plan des cycles ({{ cyclePlan.cycles.filter(c => c.kind === 'work').length }} pomodoros)</summary>
      <ol class="cycle-list">
        <template v-for="(c, i) in cyclePlan.cycles" :key="i">
          <li v-if="c.kind === 'work'" class="cycle-item">
            <div class="cycle-head">
              <strong>{{ c.label }}</strong>
              <span class="muted">{{ Math.round(c.seconds / 60) }} min</span>
            </div>
            <ul class="cycle-tasks">
              <li v-for="(t, ti) in c.items" :key="ti">
                <div>
                  <span class="tag" :class="'charge-' + t.charge" style="margin-right: 6px">{{ t.charge }}</span>
                  <strong>{{ t.name }}</strong>
                  <span class="muted"> — {{ t.minutes }} min</span>
                </div>
                <div class="muted technique">
                  {{ splitTechnique(t.minutes).read }} min lecture →
                  {{ splitTechnique(t.minutes).recite }} min récitation à blanc dans le cahier →
                  {{ splitTechnique(t.minutes).compare }} min comparaison
                </div>
              </li>
              <li v-if="c.items.length === 0" class="muted">— rien d'assigné —</li>
            </ul>
          </li>
          <li v-else class="cycle-break muted">⏸ Pause {{ Math.round(c.seconds / 60) }} min</li>
        </template>
      </ol>
    </details>

    <PomodoroTimer
      v-if="today && session.type === 'study' && !session.done"
      :session="session"
      :hours="sessionHours"
    />
    <MockStopwatch
      v-if="today && session.type === 'mock' && !session.done"
      :session="session"
    />

    <div class="row" style="margin-top: 8px">
      <button class="ghost" @click="toggleSession(session.id)">
        {{ session.done ? '↶ marquer non faite' : '✓ marquer faite' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.phase-guide {
  margin: 10px 0 4px;
  padding: 8px 10px;
  border-left: 3px solid var(--border);
  background: var(--bg-elev-2);
  border-radius: 0 6px 6px 0;
  font-size: 0.88em;
}
.phase-guide.phase-discovery { border-left-color: var(--phase-disco); }
.phase-guide.phase-memorization { border-left-color: var(--phase-memo); }
.phase-guide.phase-consolidation { border-left-color: var(--phase-conso); }
.phase-guide-intent { font-weight: 600; margin-bottom: 2px; }
.phase-guide-method { color: var(--text-dim); }

.cycle-plan {
  margin-top: 10px;
  padding: 8px 10px;
  background: var(--bg-elev-2);
  border-radius: 8px;
  border: 1px solid var(--border);
}
.cycle-plan summary {
  cursor: pointer;
  font-size: 0.88em;
  color: var(--text-dim);
  user-select: none;
}
.cycle-plan summary:hover { color: var(--text); }
.cycle-list { padding-left: 0; margin: 8px 0 0; list-style: none; }
.cycle-item { padding: 8px 0; border-top: 1px solid var(--border); }
.cycle-item:first-child { border-top: none; padding-top: 0; }
.cycle-head { display: flex; justify-content: space-between; margin-bottom: 4px; }
.cycle-tasks { margin: 4px 0; padding-left: 14px; font-size: 0.9em; }
.cycle-tasks li { margin: 4px 0; }
.cycle-break { padding: 4px 0 4px 14px; font-size: 0.85em; }
.technique { font-size: 0.82em; margin-top: 2px; padding-left: 28px; }
</style>
