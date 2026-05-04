<script setup>
import { ref } from 'vue'
import { useStore } from '../composables/useStore.js'

const {
  state,
  activeExam,
  exams,
  setActiveExam,
  updateExam,
  updateAvailability,
  regenerateActiveSchedule,
  createExam,
  deleteExam,
} = useStore()

const newExam = ref({ name: '', startDate: '', deadline: '' })
const showNew = ref(false)

const WEEKDAYS = [
  { num: 1, label: 'L' },
  { num: 2, label: 'M' },
  { num: 3, label: 'M' },
  { num: 4, label: 'J' },
  { num: 5, label: 'V' },
]

function toggleWeekday (n) {
  const exam = activeExam.value
  if (!exam) return
  const cur = new Set(exam.availability.weekdays)
  if (cur.has(n)) cur.delete(n)
  else cur.add(n)
  updateAvailability({ weekdays: [...cur].sort() })
}

function submitNew () {
  if (!newExam.value.name || !newExam.value.startDate || !newExam.value.deadline) return
  createExam({ ...newExam.value })
  newExam.value = { name: '', startDate: '', deadline: '' }
  showNew.value = false
  regenerateActiveSchedule()
}

function confirmDelete (id) {
  if (confirm('Supprimer cet examen ? Cette action est irréversible.')) {
    deleteExam(id)
  }
}
</script>

<template>
  <h1>Réglages</h1>

  <h2>Examens</h2>
  <div class="card">
    <div v-for="e in exams" :key="e.id" class="row between" style="padding: 6px 0">
      <label class="row" style="gap: 6px; flex: 1">
        <input
          type="radio"
          :checked="state.data.activeExamId === e.id"
          @change="setActiveExam(e.id)"
        />
        <span>{{ e.name }}</span>
        <span class="muted">({{ e.startDate }} → {{ e.deadline }})</span>
      </label>
      <button class="ghost danger" @click="confirmDelete(e.id)" :disabled="exams.length <= 1">✕</button>
    </div>
    <div style="margin-top: 8px">
      <button v-if="!showNew" @click="showNew = true">+ Nouvel examen</button>
      <div v-else class="form-grid">
        <label>Nom <input v-model="newExam.name" /></label>
        <label>Date de début <input type="date" v-model="newExam.startDate" /></label>
        <label>Deadline <input type="date" v-model="newExam.deadline" /></label>
        <div class="row">
          <button class="primary" @click="submitNew">Créer</button>
          <button class="ghost" @click="showNew = false">Annuler</button>
        </div>
      </div>
    </div>
  </div>

  <template v-if="activeExam">
    <h2>Examen actif — {{ activeExam.name }}</h2>
    <div class="card">
      <div class="form-grid">
        <label>
          Nom
          <input :value="activeExam.name" @change="updateExam({ name: $event.target.value })" />
        </label>
        <div class="row">
          <label style="flex: 1">
            Début
            <input
              type="date"
              :value="activeExam.startDate"
              @change="updateExam({ startDate: $event.target.value })"
            />
          </label>
          <label style="flex: 1">
            Deadline
            <input
              type="date"
              :value="activeExam.deadline"
              @change="updateExam({ deadline: $event.target.value })"
            />
          </label>
        </div>
      </div>
    </div>

    <h2>Disponibilités</h2>
    <div class="card">
      <label class="muted" style="font-size: 0.9em">Jours de semaine disponibles</label>
      <div class="weekday-toggle" style="margin-top: 6px">
        <button
          v-for="d in WEEKDAYS"
          :key="d.num"
          :class="{ on: activeExam.availability.weekdays.includes(d.num) }"
          @click="toggleWeekday(d.num)"
        >
          {{ d.label }}
        </button>
      </div>

      <div class="form-grid" style="margin-top: 12px">
        <label>
          Durée d'une session de soirée (heures)
          <input
            type="number"
            min="1"
            max="6"
            step="0.5"
            :value="activeExam.availability.sessionHours"
            @change="updateAvailability({ sessionHours: parseFloat($event.target.value) })"
          />
        </label>
        <label>
          Jour weekend pour examen blanc
          <select
            :value="activeExam.availability.weekendDay"
            @change="updateAvailability({ weekendDay: $event.target.value })"
          >
            <option value="sat">Samedi</option>
            <option value="sun">Dimanche</option>
          </select>
        </label>
      </div>
    </div>

    <h2>Planning</h2>
    <div class="card">
      <p class="muted" style="margin: 0 0 8px">
        Régénérer recalcule toutes les sessions à partir des matériaux et disponibilités.
        Les sessions cochées comme faites sont conservées si la date matche.
      </p>
      <button class="primary" @click="regenerateActiveSchedule">↻ Régénérer le planning</button>
    </div>
  </template>

  <h2>Synchronisation</h2>
  <div class="card subdued">
    <div v-if="state.syncStatus === 'local'">
      <strong>Mode local</strong>
      <p class="muted" style="margin: 4px 0 0">
        Pas de Supabase configuré. Les données restent dans ce navigateur.
        Pour activer la synchro entre tes appareils, renseigne
        <code>VITE_SUPABASE_URL</code> et <code>VITE_SUPABASE_ANON_KEY</code> dans <code>.env</code>
        (cf. README).
      </p>
    </div>
    <div v-else>
      <strong>Mode cloud</strong>
      <p class="muted" style="margin: 4px 0 0">
        État : <code>{{ state.syncStatus }}</code>. Synchro automatique entre tes appareils via Supabase.
      </p>
    </div>
  </div>
</template>
