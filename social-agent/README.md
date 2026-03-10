# 🤖 Social Content Agent

Agent IA qui génère et publie automatiquement du contenu sur **Instagram**, **Facebook** et **TikTok** — 3+ posts par plateforme par jour.

## ✨ Fonctionnalités

- **Setup interactif** — L'agent analyse votre site web et génère les profils pour chaque plateforme
- **Génération de contenu IA** — Claude génère des posts adaptés à chaque plateforme et format
- **Multi-formats** — Images, Carrousels, Reels/TikToks, Texte, Stories, Infographies, Sondages
- **Publication automatique** — Scheduler qui publie aux heures optimales
- **3+ posts/jour/plateforme** — Calendrier de contenu complet automatisé
- **Génération d'images** — Via Stability AI (optionnel)

## 🚀 Installation

```bash
cd social-agent
npm install
cp .env.example .env
# Remplir les clés API dans .env
```

## ⚙️ Configuration

### Étape 1 — Configurer les APIs

Voir le guide complet : [`config/api-setup.md`](./config/api-setup.md)

APIs requises :
| API | Usage | Requis |
|-----|-------|--------|
| Anthropic (Claude) | Génération de contenu | ✅ Oui |
| Meta Graph API | Facebook + Instagram | ✅ Pour publier |
| TikTok API | TikTok | ✅ Pour publier |
| Stability AI | Génération d'images | ⚡ Optionnel |

### Étape 2 — Lancer le setup

```bash
npm run setup
```

L'agent va :
1. Analyser votre site web
2. Générer les profils pour chaque plateforme (nom, bio, hashtags...)
3. Créer un plan de contenu hebdomadaire
4. Vous guider pour créer vos comptes manuellement

## 📱 Commandes

```bash
npm run setup         # Assistant de configuration des comptes
npm run generate      # Générer le contenu du jour
npm run schedule      # Démarrer le planificateur automatique
npm run publish-now   # Publier immédiatement (sélection interactive)
npm run status        # Voir l'état des publications et APIs
```

## 📋 Formats de contenu supportés

| Format | Instagram | Facebook | TikTok |
|--------|-----------|----------|--------|
| Image | ✅ | ✅ | ✅ |
| Carrousel | ✅ | ✅ | — |
| Reel/Vidéo courte | ✅ | ✅ | ✅ |
| Story | ✅ | — | — |
| Texte | — | ✅ | — |
| Vidéo longue | — | ✅ | — |
| Infographie | ✅ | ✅ | — |
| Sondage/Quiz | ✅ (via story) | ✅ | — |

## ⏰ Scheduler automatique

```bash
npm run schedule
```

Le scheduler :
- Génère le contenu du lendemain chaque soir à 23h45
- Vérifie les posts à publier toutes les 5 minutes
- Génère un rapport quotidien à 22h00

**Heures de publication par défaut :**

| Plateforme | Post 1 | Post 2 | Post 3 |
|-----------|--------|--------|--------|
| Instagram | 09:00 | 13:00 | 19:00 |
| Facebook | 08:00 | 12:00 | 18:00 |
| TikTok | 07:00 | 15:00 | 21:00 |

## 🏗️ Architecture

```
social-agent/
├── src/
│   ├── index.js                 # Point d'entrée CLI
│   ├── setup/
│   │   ├── wizard.js            # Assistant de configuration interactif
│   │   ├── brand-scraper.js     # Analyse du site web
│   │   └── account-generator.js # Génération des profils (Claude AI)
│   ├── content/
│   │   ├── generator.js         # Génération de contenu (Claude AI)
│   │   └── scheduler.js         # Planificateur automatique
│   ├── platforms/
│   │   ├── instagram.js         # Instagram Graph API
│   │   ├── facebook.js          # Facebook Graph API
│   │   ├── tiktok.js            # TikTok Content Posting API
│   │   └── publisher.js         # Orchestrateur de publication
│   ├── media/
│   │   └── image-generator.js   # Génération d'images (Stability AI)
│   └── utils/
│       ├── storage.js           # Stockage local (JSON)
│       └── status.js            # Affichage du statut
├── config/
│   └── api-setup.md             # Guide de configuration APIs
├── data/                        # Données générées (auto-créé)
│   ├── config.json              # Configuration des comptes
│   ├── posts/                   # Posts par date
│   └── media/                   # Images générées
├── .env.example                 # Template de configuration
└── package.json
```

## ⚠️ Notes importantes

### Création de comptes
La création automatique de comptes viole les CGU de toutes les plateformes. L'agent **génère** toutes les informations nécessaires (bio, nom, hashtags) et vous guide pour créer les comptes manuellement. Une fois créés et les APIs configurées, la publication est 100% automatique.

### Approbation API TikTok
L'API TikTok Content Posting nécessite une approbation officielle. Pour commencer, utilisez le mode sandbox avec des comptes de test.

### Images
Sans `STABILITY_API_KEY`, les posts visuels nécessiteront des images fournies manuellement. Le système fonctionnera pour les posts texte et vidéo.

## 📊 Données stockées localement

Tout est stocké dans `./data/` :
- `config.json` — Configuration de votre marque et comptes
- `posts/YYYY-MM-DD.json` — Posts générés par jour
- `media/` — Images générées

Aucune base de données externe n'est nécessaire.
