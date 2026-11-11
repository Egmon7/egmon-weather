# 3D Weather — phases

Stack : JavaScript, Tailwind CSS (CDN), Vite, Three.js, Open-Meteo, GitHub Pages.

`- [x]` = fait. `- [ ]` = pas fait. Une phase démarre quand la précédente est cochée.

Hors scope : maquette 3D des bâtiments, météo dessinée sur toute la Terre, simulation physique du vent, calcul astronomique du soleil.

```
src/
  main.js                 point d'entrée, branche l'UI
  api/geocoding.js        nom de ville → liste de lieux
  api/forecast.js         coordonnées → températures, vent, pluie
  lib/weatherCodes.js     code chiffre → mot (pluie, neige, etc.)
  state/store.js          ville active, données, favoris, vues
  ui/search.js            champ de recherche et résultats
  ui/panel.js             chiffres affichés à l'écran
  scene/renderer.js       canvas 3D, boucle d'animation
  scene/sky.js            ciel, soleil, nuit, nuages
  scene/precipitation.js  gouttes ou flocons
  scene/globe.js          Terre, marqueurs, zoom
index.html                page, zones, script Tailwind CDN
vite.config.js            config du serveur de dev
```

---

## Phase 0 — install + page vide

- [ ] Phase 0

Résultat : une page locale avec deux zones vides (scène 3D à gauche, panneau à droite), sans données météo.

```bash
node -v
npm -v
```

- [x] Node `v26.10.0` — déjà installé, la commande affiche seulement la version
- [x] npm `11.19.1` — déjà installé, la commande affiche seulement la version

```bash
npm create vite@latest . -- --template vanilla
npm install
```

- [x] `npm install three` — déjà fait. `package.json` contient `"three": "0.187.0"` et `node_modules/three` est là. Ça ne crée pas la page
- [ ] `npm create vite@latest . -- --template vanilla` — crée `index.html`, `src/main.js`, `vite.config.js`. `vanilla` = JavaScript sans React/Vue. Le dossier n'est plus vide : si Vite demande, choisir d'ignorer les fichiers existants, ne pas les supprimer (`phases.md` et `three` restent)
- [ ] `npm install` — télécharge Vite dans `node_modules`. Si `three` a disparu de `package.json` après le create, relancer `npm install three`
- [x] `package.json` contient `vite` et `three`, pas `tailwindcss`

```html
<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
```

- [x] Script CDN dans `<head>` de `index.html` — active les classes Tailwind (`flex`, `grid`, `p-4`) sans paquet npm
- [x] `#app` contient `#viewport` et `#panel`
- [x] `#viewport` — zone du futur canvas 3D, hauteur écran (`h-dvh md:h-screen`)
- [x] `#panel` — zone des chiffres, défilable (`overflow-y-auto`)
- [x] Layout `grid` + `md:grid-cols-[minmax(0,1fr)_22rem]` — sur grand écran, scène large et panneau d'environ 22 rem ; sur téléphone, les deux se suivent

```bash
npm run dev
npm run build
```

- [x] `npm run dev` — ouvre la page en local
- [ ] `npm run build` — produit le dossier `dist/`, celui qu'on déposera sur GitHub Pages

---

## Phase 1 — recherche + chiffres

- [x] Phase 1

Résultat : on tape une ville, on la choisit, le panneau affiche la météo. Pas encore de scène 3D (`THREE` non utilisé).

### `src/api/geocoding.js`

- [x] `searchCities(name)` — prend le texte tapé (« Paris »), interroge l'API, retourne un tableau de villes
- [x] `GET https://geocoding-api.open-meteo.com/v1/search` — URL appelée
- [x] Query `name`, `count=5`, `language=fr`, `format=json` — 5 résultats maximum, noms en français
- [x] Chaque résultat devient `{ id, name, country, admin1, latitude, longitude, timezone }` — id, nom, pays, région, position, fuseau horaire
- [x] Si `results` est absent — retourne `[]` (liste vide, pas une erreur)

### `src/api/forecast.js`

- [x] `fetchForecast(latitude, longitude)` — prend la position d'une ville, retourne `{ current, hourly, daily, timezone }`
- [x] `GET https://api.open-meteo.com/v1/forecast` — URL appelée
- [x] `timezone=auto` — heures renvoyées dans le fuseau de la ville, pas celui de l'ordinateur
- [x] `current=temperature_2m` — température actuelle, °C
- [x] `current=apparent_temperature` — température ressentie, °C
- [x] `current=relative_humidity_2m` — humidité, %
- [x] `current=weather_code` — code chiffre de la situation (ensoleillé, pluie, neige…)
- [x] `current=wind_speed_10m` — vitesse du vent, km/h
- [x] `current=wind_direction_10m` — direction d'où vient le vent, en degrés
- [x] `current=precipitation` — pluie tombée sur l'heure en cours, mm
- [x] `current=cloud_cover` — couverture nuageuse, %
- [x] `current=is_day` — `1` jour, `0` nuit
- [x] `hourly=...` + `forecast_hours=24` — 24 valeurs (une par heure) pour température, probabilité de pluie, quantité, code météo, vent
- [x] `daily=...` + `forecast_days=7` — 7 jours : code, min, max, cumul de pluie, probabilité, lever, coucher, vent max
- [x] `!response.ok` — si l'API répond mal, la fonction lève une erreur (le panneau pourra l'afficher)

### `src/lib/weatherCodes.js`

- [x] `weatherCodeToState(code)` — transforme le chiffre Open-Meteo en un mot utilisé par l'écran et plus tard par la 3D : `'clear' | 'cloudy' | 'fog' | 'drizzle' | 'rain' | 'snow' | 'thunder'`
- [x] Table : `0` clair, `1..3` nuageux, `45|48` brouillard, `51..57` bruine, `61..65|80..82` pluie, `71..77|85..86` neige, `95..99` orage

### `src/state/store.js`

- [x] `state.place` — ville choisie (nom + coordonnées), ou `null`
- [x] `state.forecast` — objet renvoyé par `fetchForecast`, ou `null`
- [x] `state.status` — `'idle'` rien en cours, `'loading'` appel en cours, `'ready'` données affichables, `'error'` échec
- [x] `state.recent[]` — 5 dernières villes, clé `localStorage` `weather.recent`, encore là après rechargement
- [x] `selectPlace(place)` — enregistre la ville, appelle `fetchForecast`, puis met à jour le panneau
- [x] `loadRecent()` — au démarrage, relit `weather.recent`

### `src/ui/search.js`

- [x] `#search` — champ texte ; Entrée ou submit lance la recherche
- [x] Attente ~300 ms après la frappe — évite un appel API à chaque lettre, puis appelle `searchCities`
- [x] `#results` — boutons « nom, région, pays » ; un clic appelle `selectPlace`
- [x] `#recent` — mêmes boutons, alimentés par `state.recent`

### `src/ui/panel.js`

- [x] `renderPanel(forecast)` — remplit `#panel` avec les chiffres ci-dessous
- [x] `current.temperature_2m` — température affichée
- [x] `current.apparent_temperature` — ressenti affiché
- [x] `current.relative_humidity_2m` — humidité affichée
- [x] `current.wind_speed_10m` — vitesse affichée
- [x] `current.wind_direction_10m` — direction affichée (d'où vient le vent)
- [x] `hourly.precipitation_probability[0]` — probabilité de pluie de l'heure en cours, %
- [x] `current.precipitation` et `daily.precipitation_sum[0]` — mm de l'heure, et cumul du jour
- [x] `daily.sunrise[0]`, `daily.sunset[0]` — heures de lever et coucher, déjà dans le fuseau de la ville
- [x] Boucle sur `hourly.time` (24) — ligne par heure : heure, température, code
- [x] Boucle sur `daily.time` (7) — ligne par jour : jour, min, max, code
- [x] `weatherCodeToState(current.weather_code)` — libellé lisible à côté des chiffres (clair, pluie, neige…)
- [x] `#error` — message si aucune ville, ou si `fetch` échoue
- [x] Mise en forme du panneau uniquement avec des classes Tailwind

---

## Phase 2 — ciel, pluie, neige

- [x] Phase 2

Résultat : derrière le panneau, un ciel 3D qui correspond à la ville choisie. Le panneau de la phase 1 reste cliquable par-dessus (`absolute`, `z-10`).

### `src/scene/renderer.js`

- [x] `THREE.WebGLRenderer({ antialias: true, alpha: false })` — crée le canvas WebGL, bords lissés, fond opaque
- [x] `THREE.Scene` — contient les objets (ciel, sol, pluie)
- [x] `THREE.PerspectiveCamera` — point de vue, comme une caméra
- [x] `setPixelRatio(Math.min(devicePixelRatio, 2))` — netteté limitée à 2× pour ne pas surcharger le GPU
- [x] `resize` sur `window` — le canvas suit la taille de la fenêtre
- [x] `requestAnimationFrame` + `THREE.Clock` — redessine l'image à chaque frame, avec le temps écoulé
- [x] `document.visibilityState === 'hidden'` — si l'onglet est caché, on ne dessine plus (économie)

### `src/scene/sky.js`

- [x] Dôme : grande `SphereGeometry`, vue de l'intérieur (`side: BackSide`) — le ciel entoure la caméra
- [x] Uniforms `uDayFactor`, `uCloud`, `uState` — nombres envoyés au rendu : avancement jour/nuit (0 à 1), nuages (0 à 1), type de temps
- [x] `uDayFactor` calculé avec `current.is_day`, `daily.sunrise[0]`, `daily.sunset[0]` — 0 = nuit, 1 = plein jour, valeurs entre les deux à l'aube et au crépuscule
- [x] `uCloud = current.cloud_cover / 100` — 0 ciel dégagé, 1 ciel couvert
- [x] `DirectionalLight` — lumière du soleil, plus haute quand `uDayFactor` est grand, sous l'horizon la nuit
- [x] Sol : disque ou plan de couleur unie — pas de bâtiments

### `src/scene/precipitation.js`

- [x] `THREE.Points` — nuage de points (gouttes ou flocons), pas des meshes détaillés
- [x] `spawnRain(count)` — affiche des gouttes si l'état est `drizzle`, `rain` ou `thunder`
- [x] `spawnSnow(count)` — affiche des flocons si l'état est `snow`
- [x] `RAIN_MAX` / `SNOW_MAX` — nombre de points plafond, pour garder une animation fluide
- [x] `mesh.visible = false` si `clear`, `cloudy` ou `fog` — pas de précipitations dans ces cas
- [x] Chaque frame, les points descendent (`velocity`) — la pluie tombe, la neige descend plus lentement
- [x] Après `selectPlace` : `sky.setForecast(forecast)` met à jour couleurs et soleil ; `precipitation.setState(...)` choisit pluie, neige ou rien

---

## Phase 3 — globe, favoris, GPS

- [x] Phase 3

Résultat : une Terre cliquable. Choisir une ville zoome puis montre son ciel. Les favoris restent après fermeture de l'onglet. Le GPS charge la météo de l'endroit où l'on est.

### `src/scene/globe.js`

- [x] `state.view` vaut `'globe'` ou `'sky'` — soit on voit la Terre, soit le ciel de la phase 2
- [x] Sphère `SphereGeometry(1, 64, 64)` + texture — globe terrestre
- [x] `latLonToVector3(lat, lon, radius)` — convertit latitude/longitude en position 3D sur la sphère
- [x] Marqueur — petite sphère posée sur la ville active
- [x] `Raycaster` au clic — détecte si le clic touche un marqueur ; si oui, sélectionne cette ville ; si non, ne fait rien
- [x] `flyTo(lat, lon)` — déplace la caméra vers la ville
- [x] À la fin de `flyTo` — `state.view = 'sky'`, le ciel et le panneau de cette ville s'affichent
- [x] `#view-toggle` — bouton pour revenir au globe ou au ciel

### Favoris

- [x] `state.favorites[]`, clé `localStorage` `weather.favorites` — liste gardée dans le navigateur
- [x] `addFavorite(place)` / `removeFavorite(id)` — ajoute ou retire une ville de cette liste
- [x] `#favorites` — boutons ; un clic charge la météo (`selectPlace`) et lance `flyTo`
- [x] Un `THREE.Mesh` par favori sur le globe — repères visibles, sans demander la météo de toutes les villes d'un coup
- [x] `fetchForecast` seulement pour `state.place` — une requête pour la ville affichée

### GPS

- [x] `#locate` appelle `navigator.geolocation.getCurrentPosition` — le navigateur demande la permission, puis donne latitude et longitude
- [x] Succès : `selectPlace({ latitude, longitude, name: null })` — charge la météo de ce point
- [x] `name === null` — le panneau affiche les coordonnées (`toFixed(2)`), pas un nom de ville. Open-Meteo ne fait pas l'inverse (coordonnées → nom)
- [x] Permission refusée — texte dans `#error`

---

## Phase 4 — vent, transitions, téléphone

- [x] Phase 4

Résultat : la pluie penche avec le vent, le ciel change en fondu, et un téléphone affiche moins de particules.

- [x] Inclinaison des gouttes / flocons depuis `wind_speed_10m` et `wind_direction_10m` — plus le vent est fort, plus la chute est penchée
- [x] `sky.setForecast` fait un fondu de 300–600 ms sur `uDayFactor` et `uCloud` — le ciel ne saute pas d'un coup quand on change de ville
- [x] `flyTo` dure un temps fixe, accélération puis freinage (`easeInOut`) — le zoom n'est pas linéaire
- [x] `quality` : `'high'` ou `'low'` — `matchMedia('(max-width: 768px)')` force `'low'` sur petit écran
- [x] En `'low'` : moins de gouttes (`RAIN_MAX`, `SNOW_MAX`) et `setPixelRatio` ≤ 1.5 — image plus légère
- [x] Parcours à vérifier à la main : recherche → panneau → favori → rechargement de la page (le favori est encore là) → GPS → globe → zoom → ciel → lignes horaires et sur 7 jours

---

## Suivi

- [ ] Phase 0 — page vide, Vite, Tailwind CDN, Three.js installé
- [x] Phase 1 — recherche de ville et panneau de chiffres
- [x] Phase 2 — ciel, pluie, neige
- [x] Phase 3 — globe, favoris, GPS
- [x] Phase 4 — vent, fondus, mode téléphone
