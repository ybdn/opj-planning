// Données pré-remplies pour l'examen OPJ de Yoann (5 → 26 mai 2026).
// Modifiable depuis l'UI Paramètres / Matériaux après le premier lancement.

import { uid } from './util.js'

// Familles utilisées pour le regroupement des matériaux dans les sessions.
// L'ordre ici est aussi l'ordre d'attaque par défaut en phase Mémorisation.
//
// Note TACL : le tableau des articles des cadres légaux n'est PAS modélisé
// comme un matériau séparé. La ligne TACL d'un acte se révise en même temps
// que l'acte lui-même (cf. brief : l'app est un planning, pas un référentiel
// d'articles).
export const FAMILIES = [
  'Témoin',
  'Victime',
  'Mis en cause',
  'Réquisitions',
  'Perquisition & Saisie',
  'Orphelins',
]

// Charges : S ≈ 25 min, M ≈ 45 min, L ≈ 70 min dans une session de 2h.
// Seuls les 6 PV explicitement marqués L par Yoann sont lourds, le reste est M.
const M = 'M'
const S = 'S'
const L = 'L'

// Liste des 26 PV (actes d'enquête) à apprendre par cœur, regroupés par famille.
const ACTES = [
  // Témoin
  { name: 'Audition de témoin', family: 'Témoin', charge: M },
  { name: "Audition sous couvert d'anonymat", family: 'Témoin', charge: M },
  { name: 'Audition du représentant légal (mineur auteur)', family: 'Témoin', charge: M },
  // Victime
  { name: 'Audition de victime', family: 'Victime', charge: M },
  { name: 'Audition du représentant légal (mineur victime)', family: 'Victime', charge: M },
  // Mis en cause
  { name: 'Audition libre de personne mise en cause', family: 'Mis en cause', charge: L },
  { name: 'Retenue judiciaire (10-13 ans)', family: 'Mis en cause', charge: L },
  { name: 'Garde à vue mineur (13-18 ans)', family: 'Mis en cause', charge: L },
  { name: 'Garde à vue majeur (+18 ans)', family: 'Mis en cause', charge: L },
  // Réquisitions
  { name: 'Réquisition à prestataire de service', family: 'Réquisitions', charge: M },
  { name: 'Réquisition à personne qualifiée', family: 'Réquisitions', charge: M },
  { name: "Réquisition aux fins de remise d'informations", family: 'Réquisitions', charge: M },
  { name: 'Réquisition à autorité militaire', family: 'Réquisitions', charge: M },
  { name: 'Réquisition de géolocalisation (temps réel)', family: 'Réquisitions', charge: M },
  { name: 'Réquisition de sonorisation et fixation d\'images', family: 'Réquisitions', charge: M },
  { name: 'Réquisition d\'interception (judiciaire)', family: 'Réquisitions', charge: M },
  // Perquisition & Saisie
  { name: 'Perquisition', family: 'Perquisition & Saisie', charge: L },
  { name: 'Saisie', family: 'Perquisition & Saisie', charge: M },
  { name: 'Saisie incidente', family: 'Perquisition & Saisie', charge: S },
  { name: 'Bris de scellé et restitution/destruction', family: 'Perquisition & Saisie', charge: S },
  // Orphelins
  { name: 'Transport, constatations et mesures prises', family: 'Orphelins', charge: L },
  { name: 'Investigations', family: 'Orphelins', charge: M },
  { name: "Interpellation et remise à l'OPJ", family: 'Orphelins', charge: M },
  { name: 'Assistance autopsie', family: 'Orphelins', charge: S },
  { name: 'Transcription', family: 'Orphelins', charge: S },
  { name: 'Mandats', family: 'Orphelins', charge: S },
]

export function buildSeedExam () {
  const materials = ACTES.map((m) => ({
    id: uid(),
    name: m.name,
    family: m.family,
    charge: m.charge,
    done: false,
  }))

  return {
    id: uid(),
    name: 'OPJ',
    startDate: '2026-05-05',
    deadline: '2026-05-26',
    archived: false,
    availability: {
      weekdays: [1, 2, 3, 4, 5], // lundi à vendredi
      sessionHours: 2,
      weekendDay: 'sat', // samedi par défaut, modifiable
    },
    materials,
    sessions: [], // rempli par le scheduler
  }
}

export function buildInitialState () {
  const exam = buildSeedExam()
  return {
    version: 1,
    exams: [exam],
    activeExamId: exam.id,
  }
}
