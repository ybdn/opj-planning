# opj-planning

App perso de planning de révision (Vue 3 + Vite). Mobile-first, thème sombre,
synchro multi-appareils via Supabase (optionnelle, fallback localStorage).

Pré-rempli pour la révision de l'examen OPJ : 26 actes d'enquête + 6 colonnes
TACL, regroupés par familles, avec algo de répartition en 3 phases (Découverte
→ Mémorisation → Consolidation) et 1 examen blanc par weekend.

---

## Démarrage local

```bash
npm install
npm run dev
```

L'app fonctionne immédiatement en mode local (localStorage). Pour activer la
synchro Supabase, voir ci-dessous.

## Activer la synchro Supabase (optionnel)

1. Crée un projet Supabase gratuit sur [supabase.com](https://supabase.com).
2. Dans le **SQL Editor**, exécute le contenu de `supabase/schema.sql`.
3. Récupère l'**URL** et l'**anon key** dans Settings → API.
4. Crée un fichier `.env` à la racine :

   ```env
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGc...
   VITE_WORKSPACE_ID=default
   ```

5. Relance `npm run dev`. Le bandeau en haut à droite passe à `● synchro`.

> ⚠ La clé anon est embarquée dans le bundle public (pas de secret).
> Quiconque a l'URL voit tes données. C'est OK pour un usage perso, ne reproduis
> pas ce schéma pour des données sensibles ou multi-utilisateurs.

## Déploiement sur GitHub Pages

1. Pousse le repo sur GitHub.
2. Dans **Settings → Pages**, choisis "GitHub Actions" comme source.
3. Si tu utilises Supabase, ajoute deux secrets dans **Settings → Secrets and variables → Actions** :
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Pousse sur `main` — le workflow `.github/workflows/deploy.yml` build et déploie automatiquement.
5. L'app est dispo à `https://<user>.github.io/<repo>/`.

## Structure

```
src/
├── App.vue                 ← shell + tab bar
├── main.js
├── style.css
├── lib/
│   ├── seed.js             ← données OPJ pré-remplies + liste des familles
│   ├── scheduler.js        ← algo de génération du planning (3 phases)
│   ├── storage.js          ← localStorage + Supabase
│   └── util.js             ← dates, ids, charges
├── composables/
│   └── useStore.js         ← état Vue réactif + persistance
└── components/
    ├── HomeView.vue
    ├── PlanningView.vue
    ├── MaterialsView.vue
    ├── SettingsView.vue
    └── SessionCard.vue
supabase/schema.sql         ← à exécuter dans le SQL Editor Supabase
```

## Modifier l'algo de répartition

Tout est dans `src/lib/scheduler.js`. Trois fonctions clés :
- `buildDiscoverySessions` — balayage rapide
- `buildMemorizationSessions` — packing greedy par famille, lourds prioritaires
- `buildConsolidationSessions` — repasse uniforme

Les charges S/M/L se traduisent en points (`CHARGE_POINTS` dans `util.js`).
Une session de soirée vaut 4 points (`SESSION_BUDGET` dans `scheduler.js`).
