<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../composables/useStore.js'
import { todayISO, addDays, parseDate } from '../lib/util.js'
import SessionCard from './SessionCard.vue'

const { activeExam, moveMockSession } = useStore()
const filter = ref('upcoming') // 'all' | 'upcoming' | 'past'

const today = todayISO()

const sessions = computed(() => {
  const exam = activeExam.value
  if (!exam) return []
  if (filter.value === 'upcoming') return exam.sessions.filter((s) => s.date >= today)
  if (filter.value === 'past') return exam.sessions.filter((s) => s.date < today)
  return exam.sessions
})

function moveMock (s) {
  const d = parseDate(s.date)
  // sat (6) → sun (+1), sun (0) → sat (-1)
  const newDate = d.getDay() === 6 ? addDays(s.date, 1) : addDays(s.date, -1)
  moveMockSession(s.id, newDate)
}
</script>

<template>
  <div v-if="!activeExam" class="empty">Aucun examen actif.</div>

  <div v-else>
    <h1>Planning</h1>
    <div class="row wrap" style="margin-bottom: 12px">
      <button
        v-for="f in ['upcoming', 'all', 'past']"
        :key="f"
        :class="{ primary: filter === f }"
        @click="filter = f"
      >
        {{ f === 'upcoming' ? 'À venir' : f === 'past' ? 'Passées' : 'Toutes' }}
      </button>
    </div>

    <div v-if="sessions.length === 0" class="empty">Aucune session.</div>

    <template v-for="s in sessions" :key="s.id">
      <SessionCard :session="s" :today="s.date === today" />
      <div v-if="s.type === 'mock'" class="row" style="margin: -6px 0 12px 12px">
        <button class="ghost" style="font-size: 0.85em" @click="moveMock(s)">
          Déplacer ce blanc à {{ parseDate(s.date).getDay() === 6 ? 'dimanche' : 'samedi' }}
        </button>
      </div>
    </template>
  </div>
</template>
