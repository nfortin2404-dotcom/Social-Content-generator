# Guide de configuration des APIs

## 1. Claude (Anthropic) — Génération de contenu

1. Créer un compte sur https://console.anthropic.com/
2. Aller dans "API Keys" → "Create Key"
3. Copier la clé dans `.env` : `ANTHROPIC_API_KEY=sk-ant-...`

---

## 2. Meta API (Facebook + Instagram)

### Prérequis
- Une Page Facebook (pas un profil personnel)
- Un compte Instagram Business ou Creator lié à la Page Facebook
- Un compte développeur Meta

### Étapes

1. **Créer une app Meta**
   - Aller sur https://developers.facebook.com/
   - "Mes applications" → "Créer une application"
   - Type: "Business" → entrer les informations

2. **Ajouter les produits**
   - Dans le tableau de bord de l'app → "Ajouter un produit"
   - Ajouter : "Instagram Graph API" et "Pages API"

3. **Obtenir les permissions**
   - Permissions requises:
     - `pages_manage_posts` (publier sur Facebook Pages)
     - `pages_read_engagement` (lire les stats)
     - `instagram_basic` (accès Instagram de base)
     - `instagram_content_publish` (publier sur Instagram)
     - `instagram_manage_insights` (stats Instagram)
   - Pour développement: activer le "Mode développeur" (pas besoin de review)
   - Pour production: soumettre à Meta pour review

4. **Générer un Access Token long durée**
   ```
   # Token temporaire (60 jours) via Graph API Explorer:
   https://developers.facebook.com/tools/explorer/

   # Échanger pour un token long durée (60 jours → long terme):
   GET https://graph.facebook.com/v21.0/oauth/access_token
     ?grant_type=fb_exchange_token
     &client_id={APP_ID}
     &client_secret={APP_SECRET}
     &fb_exchange_token={SHORT_LIVED_TOKEN}
   ```

5. **Obtenir les IDs**
   ```
   # ID de la Page Facebook:
   GET https://graph.facebook.com/v21.0/me/accounts?access_token={TOKEN}

   # ID du compte Instagram Business:
   GET https://graph.facebook.com/v21.0/{PAGE_ID}?fields=instagram_business_account&access_token={TOKEN}
   ```

6. **Configurer `.env`**
   ```
   META_APP_ID=123456789
   META_APP_SECRET=abcdef...
   META_ACCESS_TOKEN=EAABwzL...
   FACEBOOK_PAGE_ID=123456789
   INSTAGRAM_BUSINESS_ACCOUNT_ID=987654321
   ```

---

## 3. TikTok API

### Important
L'API TikTok Content Posting nécessite une **approbation officielle** de TikTok.
Pour les développeurs individuels, commencer par le mode sandbox.

### Étapes

1. **Créer une app TikTok**
   - Aller sur https://developers.tiktok.com/
   - "Manage Apps" → "Connect an app"

2. **Ajouter les scopes**
   - `video.upload` (upload vidéos)
   - `video.publish` (publier vidéos)
   - `user.info.basic` (infos profil)

3. **Mode Sandbox**
   - Tester sans approbation officielle
   - Limité à des comptes de test autorisés

4. **Authentification OAuth 2.0**
   ```
   # URL d'autorisation:
   https://www.tiktok.com/v2/auth/authorize/
     ?client_key={CLIENT_KEY}
     &response_type=code
     &scope=video.upload,video.publish,user.info.basic
     &redirect_uri={YOUR_REDIRECT_URI}

   # Échanger le code pour un access token:
   POST https://open.tiktokapis.com/v2/oauth/token/
   {
     "client_key": "...",
     "client_secret": "...",
     "code": "...",
     "grant_type": "authorization_code",
     "redirect_uri": "..."
   }
   ```

5. **Configurer `.env`**
   ```
   TIKTOK_CLIENT_KEY=aw...
   TIKTOK_CLIENT_SECRET=...
   TIKTOK_ACCESS_TOKEN=act...
   TIKTOK_OPEN_ID=...
   ```

---

## 4. Stability AI (Génération d'images — Optionnel)

1. Créer un compte sur https://platform.stability.ai/
2. "API Keys" → "Create API Key"
3. Configurer `.env` : `STABILITY_API_KEY=sk-...`

Sans cette clé, le système fonctionnera mais les posts nécessiteront des images manuelles.

---

## Vérification de la configuration

```bash
npm run status
```

Cela affichera quelles APIs sont configurées et lesquelles manquent.
