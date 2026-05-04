<script setup>
import { computed } from 'vue'
import { useStore } from '../composables/useStore.js'
import { todayISO, formatHuman, parseDate } from '../lib/util.js'
import SessionCard from './SessionCard.vue'

const emit = defineEmits(['go'])
const { activeExam, todaySession, progress, feasibility } = useStore()

const today = todayISO()

const nextSession = computed(() => {
  const exam = activeExam.value
  if (!exam) return null
  return exam.sessions.find((s) => s.date >= today && !s.done) || null
})

const daysLeft = computed(() => {
  const exam = activeExam.value
  if (!exam) return 0
  const ms = parseDate(exam.deadline) - parseDate(today)
  return Math.max(0, Math.ceil(ms / 86400000))
})
</script>

<template>
  <div v-if="!activeExam" class="empty">Aucun examen actif. Crée-en un dans Réglages.</div>

  <div v-else>
    <h1>{{ activeExam.name }}</h1>
    <div class="muted">
      Deadline {{ formatHuman(activeExam.deadline) }} — J–{{ daysLeft }}
    </div>

    <div class="card" style="margin-top: 16px">
      <div class="row between">
        <strong>Progression</strong>
        <span>{{ progress.done }} / {{ progress.total }} ({{ progress.pct }}%)</span>
      </div>
      <div class="progress" style="margin-top: 8px">
        <div :style="{ width: progress.pct + '%' }" />
      </div>
    </div>

    <div v-if="feasibility && !feasibility.sufficient" class="card subdued" style="border-color: var(--warn)">
      <strong style="color: var(--warn)">⚠ Charge serrée</strong>
      <div class="muted" style="margin-top: 4px">
        {{ feasibility.totalCost }} pts à apprendre pour {{ feasibility.capacity }} pts dispo
        ({{ feasibility.weekdayCount }} soirées). Ratio {{ feasibility.ratio }}.
        {{ feasibility.tight ? 'Ça passe juste — pas de marge.' : 'Allonge la deadline ou ajoute des soirées.' }}
      </div>
    </div>

    <h2>Aujourd'hui</h2>
    <SessionCard v-if="todaySession" :session="todaySession" :today="true" />
    <div v-else class="card subdued muted">
      Pas de session prévue aujourd'hui.
      <a v-if="nextSession" href="#" @click.prevent="emit('go', 'planning')">
        Prochaine : {{ formatHuman(nextSession.date) }}
      </a>
    </div>
  </div>
</template>
