<script setup>
defineProps({ open: { type: Boolean, default: false } })
defineEmits(['close'])
</script>

<template>
  <Teleport to="body">
    <div v-if="open" class="manual-overlay" @click.self="$emit('close')">
      <div class="manual-panel">
        <header class="manual-header">
          <h2>Mode d'emploi</h2>
          <button class="ghost" @click="$emit('close')">✕ Fermer</button>
        </header>

        <div class="manual-body">
          <section>
            <h3>1. Vue d'ensemble</h3>
            <p>
              L'app est un <strong>planning de révision</strong>. Elle te dit, chaque jour,
              quels matériaux travailler et selon quelle méthode. Elle ne contient pas
              le contenu de tes cours — tu lis tes fiches papier et tu écris dans ton cahier.
            </p>
            <ul>
              <li><strong>Accueil</strong> : ce qu'il faut faire aujourd'hui + progression globale.</li>
              <li><strong>Planning</strong> : toutes les sessions sur la durée de l'examen.</li>
              <li><strong>Matériaux</strong> : la liste des PV à apprendre, regroupés par famille.</li>
              <li><strong>Réglages</strong> : examen, dates, disponibilités, synchro.</li>
            </ul>
          </section>

          <section>
            <h3>2. Les 3 phases d'apprentissage</h3>
            <p>
              L'app répartit automatiquement les sessions en trois phases successives.
              À chaque session, le bandeau coloré te rappelle ce qu'on attend de toi.
            </p>
            <dl class="phase-list">
              <dt class="phase-discovery">Découverte (bleu)</dt>
              <dd>
                Survol rapide. Tu lis chaque PV une fois <em>sans chercher à retenir</em>.
                Tu repères la structure, les sections, les pièges. Note les têtes de section dans ton cahier.
              </dd>
              <dt class="phase-memorization">Mémorisation (orange)</dt>
              <dd>
                Le vrai travail. Pour chaque PV :
                <ol>
                  <li>Lis ton cours <strong>une fois</strong> attentivement.</li>
                  <li><strong>Ferme</strong> le support (cahier, fiche, écran).</li>
                  <li>Écris dans ton cahier <strong>de mémoire</strong> ce dont tu te souviens.</li>
                  <li><strong>Compare</strong> avec ton support, repère les oublis.</li>
                  <li><strong>Recommence</strong> sur ce qui a été oublié.</li>
                </ol>
              </dd>
              <dt class="phase-consolidation">Consolidation (vert)</dt>
              <dd>
                Restitution à blanc, <em>sans relecture préalable</em>. Tu écris le PV de mémoire,
                puis tu vérifies. Si ça coince, décoche le matériau dans la liste pour signaler "à retravailler".
              </dd>
              <dt class="type-mock">Examen blanc (violet, weekend)</dt>
              <dd>
                8h en conditions réelles. Pas de support, pas de pomodoro. Tu poses, tu rédiges,
                tu gères ton temps comme le jour J. Ça valide ton endurance autant que ton contenu.
              </dd>
            </dl>
          </section>

          <section>
            <h3>3. Le pomodoro adapté</h3>
            <p>
              Pendant les sessions de soirée (2h par défaut), un timer pomodoro découpe le temps
              en cycles <strong>25 min travail / 5 min pause</strong>. Sur 2h tu fais 4 cycles.
            </p>
            <ul>
              <li>Le timer ne s'affiche que sur la <strong>session du jour</strong>.</li>
              <li>Si tu fermes l'onglet ou verrouilles ton téléphone, le timer reprend pile où il en était.</li>
              <li>Un bip + une notification système signalent chaque transition de cycle.</li>
              <li>Pour les <em>examens blancs</em> du weekend, c'est un chronomètre simple à la place (pas de cycles).</li>
            </ul>
            <p>
              Sous la liste des matériaux, le panneau <strong>Plan des cycles</strong>
              (à déplier) te dit pour chaque cycle <em>quel matériau</em> travailler et
              <em>combien de minutes</em> y consacrer, avec un découpage technique :
            </p>
            <p class="technique-breakdown">
              <span class="step">25%</span> lecture active &nbsp;→&nbsp;
              <span class="step">50%</span> récitation à blanc dans le cahier &nbsp;→&nbsp;
              <span class="step">25%</span> comparaison
            </p>
          </section>

          <section>
            <h3>4. Cocher au fur et à mesure</h3>
            <ul>
              <li>
                Coche un <strong>matériau</strong> dans la session ou dans la vue Matériaux quand tu
                considères qu'il est acquis. Il apparaît barré dans la suite.
              </li>
              <li>
                Coche une <strong>session</strong> entière comme faite via le bouton "✓ marquer faite"
                en bas de la carte session.
              </li>
              <li>
                En phase Consolidation, <strong>décocher</strong> un matériau signifie "à retravailler" :
                il sera mis en avant dans les sessions suivantes.
              </li>
              <li>
                La <strong>barre de progression</strong> de l'accueil reflète le ratio
                matériaux cochés / total.
              </li>
            </ul>
          </section>

          <section>
            <h3>5. Modifier le planning</h3>
            <ul>
              <li>
                <strong>Ajouter / retirer un matériau</strong> : onglet Matériaux. La régénération du planning
                se déclenche manuellement (bouton "↻ régénérer planning").
              </li>
              <li>
                <strong>Changer la charge S/M/L</strong> d'un matériau : sélecteur à droite du nom.
                Régénère ensuite pour que la nouvelle pondération soit prise en compte.
              </li>
              <li>
                <strong>Décaler un examen blanc</strong> du samedi au dimanche (ou inverse) :
                onglet Planning, bouton "Déplacer ce blanc à dimanche/samedi" sous chaque session weekend.
              </li>
              <li>
                <strong>Changer les disponibilités</strong> (jours de semaine, durée, jour weekend) :
                onglet Réglages. Pense à régénérer le planning après.
              </li>
              <li>
                <strong>Régénérer</strong> conserve les sessions déjà cochées comme faites quand la date matche.
              </li>
            </ul>
          </section>

          <section>
            <h3>6. Synchronisation entre tes appareils</h3>
            <p>
              Si Supabase est configuré (cf. README), tes données se synchronisent automatiquement
              entre PC pro, PC perso et téléphone. L'indicateur en haut à droite affiche l'état :
            </p>
            <ul>
              <li><span class="badge ok">● synchro</span> tout est à jour côté cloud</li>
              <li><span class="badge">↻ envoi…</span> push en cours</li>
              <li><span class="badge warn">⚠ hors ligne</span> tu travailles en local, ça repartira au prochain réseau</li>
              <li><span class="badge">local</span> Supabase non configuré, tout reste sur cet appareil</li>
            </ul>
          </section>

          <section>
            <h3>7. Cas concret : une soirée type</h3>
            <ol>
              <li>Tu ouvres l'app, onglet Accueil.</li>
              <li>Tu lis le bandeau de phase ("Mémorisation : lis 1× → ferme → écris de mémoire…").</li>
              <li>Tu déplies "Plan des cycles" pour voir le découpage des 4 pomodoros.</li>
              <li>Tu cliques <strong>▶ Démarrer pomodoro</strong>. Cahier ouvert, support à côté.</li>
              <li>Cycle 1 (25 min) — tu suis le découpage : lecture, fermeture, écriture, comparaison.</li>
              <li>Bip → 5 min de pause.</li>
              <li>Tu enchaînes les cycles 2, 3, 4. Coche les matériaux acquis au fur et à mesure.</li>
              <li>Bip final → tu marques la session comme faite.</li>
            </ol>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.manual-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.55);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overscroll-behavior: contain;
}
.manual-panel {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 14px;
  width: 100%;
  max-width: 720px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}
.manual-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  background: var(--bg);
}
.manual-header h2 { margin: 0; font-size: 1.1rem; }
.manual-body {
  overflow-y: auto;
  padding: 16px 18px 24px;
}
.manual-body section { margin-bottom: 20px; }
.manual-body h3 {
  font-size: 1rem;
  margin: 0 0 8px;
  color: var(--accent);
}
.manual-body p { margin: 6px 0; }
.manual-body ul, .manual-body ol { margin: 6px 0 6px 20px; padding: 0; }
.manual-body li { margin: 3px 0; }

.phase-list dt {
  font-weight: 600;
  margin-top: 10px;
  margin-bottom: 4px;
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.88em;
  border: 1px solid var(--border);
}
.phase-list dt.phase-discovery { color: var(--phase-disco); border-color: var(--phase-disco); }
.phase-list dt.phase-memorization { color: var(--phase-memo); border-color: var(--phase-memo); }
.phase-list dt.phase-consolidation { color: var(--phase-conso); border-color: var(--phase-conso); }
.phase-list dt.type-mock { color: var(--mock); border-color: var(--mock); }
.phase-list dd { margin: 4px 0 8px 0; padding-left: 0; color: var(--text); font-size: 0.94em; }

.technique-breakdown {
  text-align: center;
  background: var(--bg-elev-2);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 0.92em;
}
.technique-breakdown .step {
  display: inline-block;
  background: var(--accent);
  color: #fff;
  border-radius: 4px;
  padding: 0 6px;
  font-weight: 600;
  font-size: 0.85em;
}

.badge {
  display: inline-block;
  font-size: 0.78em;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid var(--border);
  margin-right: 4px;
}
.badge.ok { color: var(--ok); border-color: var(--ok); }
.badge.warn { color: var(--warn); border-color: var(--warn); }
</style>
