<script setup>
import { computed, ref } from 'vue'
import { useStore } from '../composables/useStore.js'
import { FAMILIES } from '../lib/seed.js'

const { activeExam, toggleMaterial, updateMaterial, addMaterial, removeMaterial, regenerateActiveSchedule } = useStore()

const newMat = ref({ name: '', family: 'Orphelins', charge: 'M' })

const grouped = computed(() => {
  const exam = activeExam.value
  if (!exam) return []
  const groups = new Map()
  for (const m of exam.materials) {
    const key = m.family || 'Orphelins'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(m)
  }
  // Ordre figé selon FAMILIES
  return FAMILIES
    .filter((f) => groups.has(f))
    .map((f) => ({ family: f, items: groups.get(f) }))
    .concat(
      [...groups.entries()]
        .filter(([f]) => !FAMILIES.includes(f))
        .map(([f, items]) => ({ family: f, items }))
    )
})

function submitNew () {
  if (!newMat.value.name.trim()) return
  addMaterial({ ...newMat.value, name: newMat.value.name.trim() })
  newMat.value = { name: '', family: 'Orphelins', charge: 'M' }
}
</script>

<template>
  <div v-if="!activeExam" class="empty">Aucun examen actif.</div>

  <div v-else>
    <h1>Matériaux</h1>
    <div class="muted" style="margin-bottom: 12px">
      {{ activeExam.materials.length }} matériaux ·
      <button class="ghost" style="font-size: 0.85em; padding: 2px 8px" @click="regenerateActiveSchedule">
        ↻ régénérer planning
      </button>
    </div>

    <div v-for="g in grouped" :key="g.family">
      <h2>{{ g.family }} <span class="muted" style="font-weight: 400">({{ g.items.length }})</span></h2>
      <div class="card">
        <div v-for="m in g.items" :key="m.id" class="material" :class="{ done: m.done }">
          <input type="checkbox" :checked="m.done" @change="toggleMaterial(m.id)" />
          <span class="name">{{ m.name }}</span>
          <select :value="m.charge" @change="updateMaterial(m.id, { charge: $event.target.value })">
            <option value="S">S</option>
            <option value="M">M</option>
            <option value="L">L</option>
          </select>
          <button class="ghost danger" style="padding: 4px 8px" @click="removeMaterial(m.id)" title="Supprimer">✕</button>
        </div>
      </div>
    </div>

    <h2>Ajouter un matériau</h2>
    <div class="card">
      <div class="form-grid">
        <label>
          Nom
          <input v-model="newMat.name" placeholder="ex : Audition de complice" @keyup.enter="submitNew" />
        </label>
        <div class="row">
          <label style="flex: 1">
            Famille
            <select v-model="newMat.family">
              <option v-for="f in FAMILIES" :key="f" :value="f">{{ f }}</option>
            </select>
          </label>
          <label style="width: 120px">
            Charge
            <select v-model="newMat.charge">
              <option value="S">S — courte</option>
              <option value="M">M — moyenne</option>
              <option value="L">L — longue</option>
            </select>
          </label>
        </div>
        <button class="primary" :disabled="!newMat.name.trim()" @click="submitNew">+ Ajouter</button>
      </div>
    </div>
  </div>
</template>
