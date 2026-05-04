// Persistance de l'état applicatif.
//
// Architecture :
//  - localStorage = source de vérité immédiate (toujours utilisé, même avec Supabase)
//  - Supabase = miroir cloud pour la synchro entre les 3 appareils de Yoann
//  - Pas d'auth : 1 seule ligne dans la table `app_state`, identifiée par
//    workspaceId (cf. .env). Quiconque a l'URL+anon key voit ces données — c'est
//    OK pour un usage perso, à ne pas reproduire pour des données sensibles.
//
// Stratégie de conflit : last-write-wins, tracé via updated_at côté Supabase
// et un timestamp local. Mono-utilisateur, donc pas de conflits réels attendus.

import { createClient } from '@supabase/supabase-js'

const LS_KEY = 'opj-planning-state'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const WORKSPACE_ID = import.meta.env.VITE_WORKSPACE_ID || 'default'

export const hasSupabase = Boolean(SUPABASE_URL && SUPABASE_KEY)

let supabase = null
if (hasSupabase) {
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
    realtime: { params: { eventsPerSecond: 2 } },
  })
}

// --- localStorage ---

export function loadLocal () {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveLocal (state) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  } catch {
    // quota exceeded ou storage indisponible — on échoue silencieusement,
    // l'état reste en mémoire dans Vue
  }
}

// --- Supabase ---

export async function loadRemote () {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('app_state')
    .select('data, updated_at')
    .eq('id', WORKSPACE_ID)
    .maybeSingle()
  if (error) {
    console.warn('[supabase] load failed', error.message)
    return null
  }
  if (!data) return null
  return { state: data.data, updatedAt: data.updated_at }
}

export async function saveRemote (state) {
  if (!supabase) return false
  const { error } = await supabase
    .from('app_state')
    .upsert({ id: WORKSPACE_ID, data: state, updated_at: new Date().toISOString() })
  if (error) {
    console.warn('[supabase] save failed', error.message)
    return false
  }
  return true
}

// Realtime : appelle `onUpdate(state)` quand un autre appareil pousse une maj.
export function subscribeRemote (onUpdate) {
  if (!supabase) return () => {}
  const channel = supabase
    .channel('app_state_changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'app_state', filter: `id=eq.${WORKSPACE_ID}` },
      (payload) => {
        if (payload.new && payload.new.data) onUpdate(payload.new.data)
      }
    )
    .subscribe()
  return () => supabase.removeChannel(channel)
}
