// Petits utilitaires partagés. Pas de dépendance externe.

export function uid () {
  // ID court suffisant pour un usage perso (collisions négligeables).
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// Normalise une date YYYY-MM-DD en Date locale (pas d'UTC, pour éviter
// les décalages d'un jour selon le fuseau).
export function parseDate (iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function formatISO (date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// 0 = dimanche, 1 = lundi, ..., 6 = samedi (convention JS Date.getDay).
export function dayOfWeek (iso) {
  return parseDate(iso).getDay()
}

export function addDays (iso, n) {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return formatISO(d)
}

// Itère du jour de début (inclus) jusqu'à la deadline (incluse).
export function* iterDays (startISO, endISO) {
  let cur = startISO
  while (cur <= endISO) {
    yield cur
    cur = addDays(cur, 1)
  }
}

const FR_DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']
const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

export function formatHuman (iso) {
  const d = parseDate(iso)
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`
}

export function todayISO () {
  return formatISO(new Date())
}

// Equivalent de la charge en "points" pour l'algo de répartition.
// Une session de 2h ≈ 4 points utiles (avec marge pour pauses/imprévus).
export const CHARGE_POINTS = { S: 1, M: 1.6, L: 2.4 }
