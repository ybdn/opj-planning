// Store Vue : état global réactif + persistance + synchro Supabase.
// Pas de Pinia/Vuex — un simple objet `reactive` suffit pour 4 vues.

import { reactive, computed, watch } from 'vue'
import {
  hasSupabase,
  loadLocal,
  loadRemote,
  saveLocal,
  saveRemote,
  subscribeRemote,
} from '../lib/storage.js'
import { buildInitialState } from '../lib/seed.js'
import { buildSchedule, evaluateFeasibility } from '../lib/scheduler.js'

const state = reactive({
  ready: false,
  data: null, // { version, exams: [], activeExamId }
  syncStatus: hasSupabase ? 'connecting' : 'local', // connecting | synced | error | local
  applyingRemote: false,
})

let saveTimer = null
let unsubRemote = null

export function useStore () {
  // ----- Initial load -----
  async function init () {
    if (state.ready) return
    const local = loadLocal()
    if (hasSupabase) {
      const remote = await loadRemote()
      if (remote && remote.state) {
        state.data = remote.state
        saveLocal(remote.state)
        state.syncStatus = 'synced'
      } else if (local) {
        state.data = local
        // pas encore de ligne distante : on pousse la version locale
        state.syncStatus = 'connecting'
        const ok = await saveRemote(local)
        state.syncStatus = ok ? 'synced' : 'error'
      } else {
        state.data = buildInitialState()
        regenerateActiveSchedule()
        saveLocal(state.data)
        const ok = await saveRemote(state.data)
        state.syncStatus = ok ? 'synced' : 'error'
      }
      unsubRemote = subscribeRemote((remoteState) => {
        // On évite la boucle : on marque qu'on applique un changement distant
        // et on n'écrira pas en retour pendant ce tick
        state.applyingRemote = true
        state.data = remoteState
        saveLocal(remoteState)
        state.syncStatus = 'synced'
        // libère le flag au tick suivant
        setTimeout(() => { state.applyingRemote = false }, 0)
      })
    } else {
      state.data = local || buildInitialState()
      if (!local) regenerateActiveSchedule()
      saveLocal(state.data)
    }
    state.ready = true
  }

  // ----- Persistance auto avec debounce -----
  watch(
    () => state.data,
    (val) => {
      if (!val || state.applyingRemote) return
      saveLocal(val)
      if (hasSupabase) {
        clearTimeout(saveTimer)
        state.syncStatus = 'syncing'
        saveTimer = setTimeout(async () => {
          const ok = await saveRemote(val)
          state.syncStatus = ok ? 'synced' : 'error'
        }, 500)
      }
    },
    { deep: true }
  )

  // ----- Helpers de sélection -----
  const activeExam = computed(() => {
    if (!state.data) return null
    return state.data.exams.find((e) => e.id === state.data.activeExamId) || null
  })

  const exams = computed(() => state.data?.exams ?? [])

  const todaySession = computed(() => {
    const exam = activeExam.value
    if (!exam) return null
    const today = new Date().toISOString().slice(0, 10)
    return exam.sessions.find((s) => s.date === today) || null
  })

  const progress = computed(() => {
    const exam = activeExam.value
    if (!exam || exam.materials.length === 0) return { done: 0, total: 0, pct: 0 }
    const total = exam.materials.length
    const done = exam.materials.filter((m) => m.done).length
    return { done, total, pct: Math.round((done / total) * 100) }
  })

  const feasibility = computed(() => {
    return activeExam.value ? evaluateFeasibility(activeExam.value) : null
  })

  // ----- Mutations -----
  function setActiveExam (examId) {
    state.data.activeExamId = examId
  }

  function toggleMaterial (materialId) {
    const exam = activeExam.value
    if (!exam) return
    const m = exam.materials.find((x) => x.id === materialId)
    if (m) m.done = !m.done
  }

  function toggleSession (sessionId) {
    const exam = activeExam.value
    if (!exam) return
    const s = exam.sessions.find((x) => x.id === sessionId)
    if (s) s.done = !s.done
  }

  function updateMaterial (materialId, patch) {
    const exam = activeExam.value
    if (!exam) return
    const m = exam.materials.find((x) => x.id === materialId)
    if (m) Object.assign(m, patch)
  }

  function addMaterial (mat) {
    const exam = activeExam.value
    if (!exam) return
    exam.materials.push({
      id: cryptoRandom(),
      name: mat.name || 'Sans nom',
      family: mat.family || 'Orphelins',
      charge: mat.charge || 'M',
      done: false,
    })
  }

  function removeMaterial (materialId) {
    const exam = activeExam.value
    if (!exam) return
    exam.materials = exam.materials.filter((m) => m.id !== materialId)
    // Retire l'id des sessions
    for (const s of exam.sessions) {
      s.materialIds = s.materialIds.filter((id) => id !== materialId)
    }
  }

  function updateExam (patch) {
    const exam = activeExam.value
    if (!exam) return
    Object.assign(exam, patch)
  }

  function updateAvailability (patch) {
    const exam = activeExam.value
    if (!exam) return
    Object.assign(exam.availability, patch)
  }

  function regenerateActiveSchedule () {
    const exam = activeExam.value || state.data?.exams[0]
    if (!exam) return
    // On tente de préserver les sessions cochées par date
    const previousDone = new Map()
    for (const s of exam.sessions) {
      if (s.done) previousDone.set(s.date + '|' + s.type, true)
    }
    exam.sessions = buildSchedule(exam)
    for (const s of exam.sessions) {
      if (previousDone.has(s.date + '|' + s.type)) s.done = true
    }
  }

  function moveMockSession (sessionId, newDate) {
    const exam = activeExam.value
    if (!exam) return
    const s = exam.sessions.find((x) => x.id === sessionId)
    if (s && s.type === 'mock') {
      s.date = newDate
      exam.sessions.sort((a, b) => a.date.localeCompare(b.date))
    }
  }

  function createExam ({ name, startDate, deadline }) {
    const exam = {
      id: cryptoRandom(),
      name,
      startDate,
      deadline,
      archived: false,
      availability: { weekdays: [1, 2, 3, 4, 5], sessionHours: 2, weekendDay: 'sat' },
      materials: [],
      sessions: [],
    }
    state.data.exams.push(exam)
    state.data.activeExamId = exam.id
  }

  function deleteExam (examId) {
    state.data.exams = state.data.exams.filter((e) => e.id !== examId)
    if (state.data.activeExamId === examId) {
      state.data.activeExamId = state.data.exams[0]?.id || null
    }
  }

  return {
    state,
    init,
    activeExam,
    exams,
    todaySession,
    progress,
    feasibility,
    setActiveExam,
    toggleMaterial,
    toggleSession,
    updateMaterial,
    addMaterial,
    removeMaterial,
    updateExam,
    updateAvailability,
    regenerateActiveSchedule,
    moveMockSession,
    createExam,
    deleteExam,
  }
}

function cryptoRandom () {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export function teardown () {
  if (unsubRemote) unsubRemote()
  unsubRemote = null
}
