// Génération du planning : répartit les matériaux d'un examen sur les
// soirées dispo en semaine, et place 1 examen blanc par weekend.
//
// Logique en 3 phases (Yoann a déjà lu le contenu une fois → Découverte courte) :
//   - Découverte : ~12% des sessions, balayage rapide (overview, peu d'effort)
//   - Mémorisation : ~63% des sessions, 1 famille par session si possible,
//                    matériaux lourds (L) placés en priorité, complétés
//                    par des matériaux légers d'autres familles si reste de budget
//   - Consolidation : ~25% des sessions, repasse globale, focus implicite
//                     sur les matériaux non cochés (mis en avant dans l'UI)
//
// Une session de soirée ≈ 4 "points" (cf. CHARGE_POINTS dans util.js).

import { CHARGE_POINTS, addDays, dayOfWeek, formatISO, iterDays, parseDate, uid } from './util.js'
import { FAMILIES } from './seed.js'

const SESSION_BUDGET = 4
const OVERFLOW_TOLERANCE = 0.5 // un peu de débordement autorisé pour caser un L+S

// Une journée d'examen blanc dure 8h, on note ça dans le type 'mock'.
export function buildSchedule (exam) {
  const weekdaySlots = []
  const mockSlots = []

  const weekendDayNum = exam.availability.weekendDay === 'sun' ? 0 : 6

  for (const iso of iterDays(exam.startDate, exam.deadline)) {
    const dow = dayOfWeek(iso)
    if (dow === weekendDayNum) {
      mockSlots.push(iso)
    } else if (dow >= 1 && dow <= 5 && exam.availability.weekdays.includes(dow)) {
      weekdaySlots.push(iso)
    }
  }

  const phases = assignPhases(weekdaySlots.length)
  const studyMaterials = exam.materials.filter((m) => !isArchivedMaterial(m))
  const studySessions = buildStudySessions(studyMaterials, phases)

  // Map slot -> session
  const sessions = []
  for (let i = 0; i < weekdaySlots.length; i++) {
    const slot = studySessions[i]
    sessions.push({
      id: uid(),
      date: weekdaySlots[i],
      type: 'study',
      phase: slot.phase,
      materialIds: slot.materialIds,
      done: false,
    })
  }
  for (const date of mockSlots) {
    sessions.push({
      id: uid(),
      date,
      type: 'mock',
      phase: 'mock',
      materialIds: [],
      done: false,
    })
  }

  sessions.sort((a, b) => a.date.localeCompare(b.date))
  return sessions
}

function isArchivedMaterial (m) {
  return m.archived === true
}

function assignPhases (totalSessions) {
  if (totalSessions === 0) return []

  let discovery = Math.max(1, Math.round(totalSessions * 0.12))
  let consolidation = Math.max(2, Math.round(totalSessions * 0.25))
  // Garde-fou : si peu de sessions, on garantit au moins 1 mémo
  if (discovery + consolidation >= totalSessions) {
    discovery = Math.min(discovery, 1)
    consolidation = Math.max(1, totalSessions - discovery - 1)
  }
  const memorization = totalSessions - discovery - consolidation

  const out = []
  for (let i = 0; i < discovery; i++) out.push('discovery')
  for (let i = 0; i < memorization; i++) out.push('memorization')
  for (let i = 0; i < consolidation; i++) out.push('consolidation')
  return out
}

// Construit les "study sessions" en respectant les phases assignées.
function buildStudySessions (materials, phases) {
  const discoveryCount = phases.filter((p) => p === 'discovery').length
  const memoCount = phases.filter((p) => p === 'memorization').length
  const consoCount = phases.filter((p) => p === 'consolidation').length

  const discoverySessions = buildDiscoverySessions(materials, discoveryCount)
  const memoSessions = buildMemorizationSessions(materials, memoCount)
  const consoSessions = buildConsolidationSessions(materials, consoCount)

  return [
    ...discoverySessions.map((s) => ({ phase: 'discovery', materialIds: s })),
    ...memoSessions.map((s) => ({ phase: 'memorization', materialIds: s })),
    ...consoSessions.map((s) => ({ phase: 'consolidation', materialIds: s })),
  ]
}

// Découverte : distribue tous les matériaux à parts égales sur les sessions
// (balayage rapide, l'utilisateur ne mémorise pas encore en profondeur).
function buildDiscoverySessions (materials, count) {
  if (count === 0) return []
  const ordered = sortByFamilyThenCharge(materials)
  const buckets = Array.from({ length: count }, () => [])
  ordered.forEach((m, i) => buckets[i % count].push(m.id))
  return buckets
}

// Mémorisation : famille par famille, lourds d'abord à l'intérieur d'une famille,
// packing greedy à 4 points/session avec léger débordement autorisé.
function buildMemorizationSessions (materials, count) {
  if (count === 0) return []
  const ordered = sortByFamilyThenCharge(materials)

  // Packing initial : on commence une nouvelle session quand on dépasse le budget
  // ET qu'on change de famille (sauf si la famille est trop grosse pour tenir
  // dans une seule session — auquel cas on coupe).
  const slots = []
  let cur = newSlot()
  let curFamily = null

  for (const m of ordered) {
    const cost = CHARGE_POINTS[m.charge]
    const wouldOverflow = cur.points + cost > SESSION_BUDGET + OVERFLOW_TOLERANCE
    const familyChange = curFamily !== null && curFamily !== m.family
    const startNew = cur.ids.length > 0 && (wouldOverflow || (familyChange && cur.points >= SESSION_BUDGET * 0.6))

    if (startNew) {
      slots.push(cur)
      cur = newSlot()
    }
    cur.ids.push(m.id)
    cur.points += cost
    curFamily = m.family
  }
  if (cur.ids.length > 0) slots.push(cur)

  // Ajuste le nombre de slots au nombre de sessions disponibles.
  while (slots.length > count) mergeSmallestPair(slots)
  while (slots.length < count) splitLargest(slots)

  return slots.map((s) => s.ids)
}

// Consolidation : distribue tous les matériaux uniformément (round-robin par
// famille pour que chaque session reste équilibrée).
function buildConsolidationSessions (materials, count) {
  if (count === 0) return []
  const ordered = sortByFamilyThenCharge(materials)
  const buckets = Array.from({ length: count }, () => [])
  ordered.forEach((m, i) => buckets[i % count].push(m.id))
  return buckets
}

// --- Helpers ---

function newSlot () { return { ids: [], points: 0 } }

function sortByFamilyThenCharge (materials) {
  const familyIndex = (f) => {
    const i = FAMILIES.indexOf(f)
    return i === -1 ? FAMILIES.length : i
  }
  const chargeRank = { L: 0, M: 1, S: 2 } // lourds en premier dans la famille
  return [...materials].sort((a, b) => {
    const fa = familyIndex(a.family)
    const fb = familyIndex(b.family)
    if (fa !== fb) return fa - fb
    const ca = chargeRank[a.charge] ?? 1
    const cb = chargeRank[b.charge] ?? 1
    if (ca !== cb) return ca - cb
    return a.name.localeCompare(b.name)
  })
}

function mergeSmallestPair (slots) {
  let bestI = 0
  let bestSum = Infinity
  for (let i = 0; i < slots.length - 1; i++) {
    const s = slots[i].points + slots[i + 1].points
    if (s < bestSum) { bestSum = s; bestI = i }
  }
  slots[bestI].ids.push(...slots[bestI + 1].ids)
  slots[bestI].points += slots[bestI + 1].points
  slots.splice(bestI + 1, 1)
}

function splitLargest (slots) {
  let idx = 0
  for (let i = 1; i < slots.length; i++) {
    if (slots[i].ids.length > slots[idx].ids.length) idx = i
  }
  const big = slots[idx]
  if (big.ids.length < 2) {
    // Impossible de splitter un slot avec 1 seul matériau — on duplique l'id
    // pour produire un slot supplémentaire qui sera traité comme "repasse".
    slots.splice(idx + 1, 0, { ids: [...big.ids], points: big.points })
    return
  }
  const half = Math.ceil(big.ids.length / 2)
  const tail = { ids: big.ids.slice(half), points: big.points / 2 }
  big.ids = big.ids.slice(0, half)
  big.points = big.points / 2
  slots.splice(idx + 1, 0, tail)
}

// Évalue la faisabilité : compare la somme des charges aux sessions dispo.
export function evaluateFeasibility (exam) {
  let weekdayCount = 0
  for (const iso of iterDays(exam.startDate, exam.deadline)) {
    const dow = dayOfWeek(iso)
    if (dow >= 1 && dow <= 5 && exam.availability.weekdays.includes(dow)) {
      weekdayCount++
    }
  }
  const totalCost = exam.materials
    .filter((m) => !m.archived)
    .reduce((sum, m) => sum + CHARGE_POINTS[m.charge], 0)
  const capacity = weekdayCount * SESSION_BUDGET
  // 1.3 passes idéales = découverte (0.3) + mémo (1) + consolidation (0.5) ≈ 1.8x
  // On considère "suffisant" si capacité >= 1.4 × charge (1 passe complète + marge).
  const ratio = capacity / Math.max(totalCost, 1)
  return {
    weekdayCount,
    totalCost: Math.round(totalCost * 10) / 10,
    capacity,
    ratio: Math.round(ratio * 100) / 100,
    sufficient: ratio >= 1.4,
    tight: ratio >= 1 && ratio < 1.4,
  }
}
