<script setup>
import { onMounted, ref } from 'vue'
import { useStore } from './composables/useStore.js'
import HomeView from './components/HomeView.vue'
import PlanningView from './components/PlanningView.vue'
import MaterialsView from './components/MaterialsView.vue'
import SettingsView from './components/SettingsView.vue'

const { state, init } = useStore()
const tab = ref('home')

onMounted(init)

const tabs = [
  { id: 'home', label: 'Accueil', icon: '◐' },
  { id: 'planning', label: 'Planning', icon: '☷' },
  { id: 'materials', label: 'Matériaux', icon: '☰' },
  { id: 'settings', label: 'Réglages', icon: '⚙' },
]
</script>

<template>
  <div class="app-shell">
    <div
      v-if="state.ready"
      class="sync-indicator"
      :class="{
        ok: state.syncStatus === 'synced',
        warn: state.syncStatus === 'error',
        local: state.syncStatus === 'local',
      }"
    >
      <span v-if="state.syncStatus === 'synced'">● synchro</span>
      <span v-else-if="state.syncStatus === 'syncing'">↻ envoi…</span>
      <span v-else-if="state.syncStatus === 'connecting'">… connexion</span>
      <span v-else-if="state.syncStatus === 'error'">⚠ hors ligne</span>
      <span v-else>local</span>
    </div>

    <div v-if="!state.ready" class="empty">Chargement…</div>

    <div v-else class="view">
      <HomeView v-if="tab === 'home'" @go="tab = $event" />
      <PlanningView v-else-if="tab === 'planning'" />
      <MaterialsView v-else-if="tab === 'materials'" />
      <SettingsView v-else-if="tab === 'settings'" />
    </div>

    <nav v-if="state.ready" class="tabbar">
      <button
        v-for="t in tabs"
        :key="t.id"
        :class="{ active: tab === t.id }"
        @click="tab = t.id"
      >
        <span class="icon">{{ t.icon }}</span>
        <span>{{ t.label }}</span>
      </button>
    </nav>
  </div>
</template>
