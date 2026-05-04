// Logique pomodoro pure (sans dépendance Vue) : génération des cycles,
// calcul de l'état courant à partir d'un timestamp de démarrage.
//
// Adapté aux sessions :
//   - "study" (soirée 2h par défaut) : N cycles de 25/5, où N dépend de la durée
//   - "mock" (examen blanc 8h) : pas de pomodoro, simple chronomètre

const WORK_MIN = 25
const BREAK_MIN = 5

// Construit la séquence de cycles pour une session de `hours` heures.
// On découpe en "blocs" de 30 min (25 work + 5 break) et on omet la dernière pause
// (la session est finie, pas besoin de pause).
export function buildStudyCycles (hours = 2) {
  const totalMinutes = Math.round(hours * 60)
  const blockCount = Math.max(1, Math.floor(totalMinutes / (WORK_MIN + BREAK_MIN)))
  const cycles = []
  for (let i = 0; i < blockCount; i++) {
    cycles.push({
      kind: 'work',
      seconds: WORK_MIN * 60,
      label: `Travail ${i + 1}/${blockCount}`,
    })
    if (i < blockCount - 1) {
      cycles.push({
        kind: 'break',
        seconds: BREAK_MIN * 60,
        label: 'Pause',
      })
    }
  }
  return cycles
}

// État pomodoro persisté :
//   { sessionId, startedAt, pausedAt, totalPausedMs, hours }
// startedAt = ms epoch du démarrage initial
// pausedAt = ms epoch du dernier pause (null si en cours)
// totalPausedMs = somme des pauses cumulées avant la pause actuelle

export function computePomodoroState (persisted, nowMs = Date.now()) {
  if (!persisted) return null
  const cycles = buildStudyCycles(persisted.hours || 2)
  const totalSeconds = cycles.reduce((sum, c) => sum + c.seconds, 0)

  // Calcule combien de ms se sont écoulées effectivement (hors pauses)
  let elapsedMs
  if (persisted.pausedAt) {
    elapsedMs = persisted.pausedAt - persisted.startedAt - (persisted.totalPausedMs || 0)
  } else {
    elapsedMs = nowMs - persisted.startedAt - (persisted.totalPausedMs || 0)
  }
  const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000))

  if (elapsedSec >= totalSeconds) {
    return {
      finished: true,
      paused: false,
      cycleIndex: cycles.length - 1,
      cycle: cycles[cycles.length - 1],
      secondsLeftInCycle: 0,
      secondsLeftTotal: 0,
      totalSeconds,
      elapsedSec: totalSeconds,
      cycles,
    }
  }

  // Trouve le cycle en cours
  let acc = 0
  let idx = 0
  for (; idx < cycles.length; idx++) {
    if (elapsedSec < acc + cycles[idx].seconds) break
    acc += cycles[idx].seconds
  }
  const cycle = cycles[idx]
  const secondsLeftInCycle = acc + cycle.seconds - elapsedSec

  return {
    finished: false,
    paused: Boolean(persisted.pausedAt),
    cycleIndex: idx,
    cycle,
    secondsLeftInCycle,
    secondsLeftTotal: totalSeconds - elapsedSec,
    totalSeconds,
    elapsedSec,
    cycles,
  }
}

export function formatMMSS (seconds) {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`
}

// Texte d'objectif par phase, affiché en haut de chaque session pour rappeler
// la *méthode* à appliquer (technique de mémorisation), pas juste le contenu.
export const PHASE_GUIDE = {
  discovery: {
    title: 'Découverte',
    intent: 'Survol global. Aucune mémorisation forcée.',
    method: 'Lis chaque PV une fois calmement. Note les têtes de section dans ton cahier. Tu repères la structure, pas les détails.',
  },
  memorization: {
    title: 'Mémorisation',
    intent: 'Apprentissage actif par cœur — c\'est le vrai travail.',
    method: 'Pour chaque PV : (1) lis 1× ton cours → (2) ferme le support → (3) écris dans ton cahier de mémoire → (4) compare → (5) recommence sur ce qui a été oublié.',
  },
  consolidation: {
    title: 'Consolidation',
    intent: 'Restitution à blanc, sans relecture préalable.',
    method: 'Écris le PV de mémoire avant de regarder. Si ça coince, décoche le matériau dans la liste pour le retravailler plus tard.',
  },
  mock: {
    title: 'Examen blanc',
    intent: 'Conditions réelles, 8h.',
    method: 'Pas de support. Pose, rédige, gère ton temps comme le jour J. Tu valides ton endurance autant que ton contenu.',
  },
}

// Temps brut de mémorisation (en minutes) qu'un matériau "mérite" selon sa charge.
// Sert de pondération pour répartir un matériau sur les cycles d'une session.
const CHARGE_MINUTES = { S: 25, M: 40, L: 70 }

// Construit le plan détaillé d'une session : pour chaque cycle, quels matériaux
// travailler et combien de minutes leur consacrer. Round-robin séquentiel :
// on remplit le cycle 1, puis 2, etc.
export function buildSessionPlan (session, materials, hours = 2) {
  const cycles = buildStudyCycles(hours)
  if (!session.materialIds || session.materialIds.length === 0) {
    return { cycles: cycles.map((c) => ({ ...c, items: [] })) }
  }

  const items = session.materialIds
    .map((id) => materials.find((m) => m.id === id))
    .filter(Boolean)
  if (items.length === 0) {
    return { cycles: cycles.map((c) => ({ ...c, items: [] })) }
  }

  const totalWorkMin = cycles
    .filter((c) => c.kind === 'work')
    .reduce((s, c) => s + c.seconds / 60, 0)
  const totalRaw = items.reduce((s, m) => s + (CHARGE_MINUTES[m.charge] || 25), 0)

  // Allocation proportionnelle à la charge.
  const queue = items.map((m) => ({
    materialId: m.id,
    name: m.name,
    charge: m.charge,
    minutes: Math.max(1, Math.round((CHARGE_MINUTES[m.charge] / totalRaw) * totalWorkMin)),
  }))

  const result = []
  let qi = 0
  let qLeft = queue[0]?.minutes || 0
  for (const cycle of cycles) {
    if (cycle.kind !== 'work') {
      result.push({ ...cycle, items: [] })
      continue
    }
    let cycleLeft = cycle.seconds / 60
    const cycleItems = []
    while (cycleLeft > 0 && qi < queue.length) {
      const take = Math.min(cycleLeft, qLeft)
      if (take > 0) {
        cycleItems.push({
          materialId: queue[qi].materialId,
          name: queue[qi].name,
          charge: queue[qi].charge,
          minutes: Math.round(take),
        })
        cycleLeft -= take
        qLeft -= take
      }
      if (qLeft <= 0.01) {
        qi++
        if (qi < queue.length) qLeft = queue[qi].minutes
      }
    }
    result.push({ ...cycle, items: cycleItems })
  }
  return { cycles: result }
}

// Découpe les minutes d'un matériau en 3 phases techniques :
// lecture active (25%) → récitation à blanc dans le cahier (50%) → comparaison (25%).
export function splitTechnique (minutes) {
  const read = Math.max(1, Math.round(minutes * 0.25))
  const compare = Math.max(1, Math.round(minutes * 0.25))
  const recite = Math.max(1, minutes - read - compare)
  return { read, recite, compare }
}

// Génère un bip court (bip aigu = travail termine, bip grave = pause termine)
// via Web Audio API. Pas de fichier à charger.
let audioCtx = null
export function beep (kind = 'work-end') {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    osc.connect(gain)
    gain.connect(audioCtx.destination)
    osc.frequency.value = kind === 'work-end' ? 880 : 440
    gain.gain.setValueAtTime(0.001, audioCtx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.45)
    osc.start()
    osc.stop(audioCtx.currentTime + 0.5)
  } catch {
    // pas critique si l'audio est indisponible
  }
}
