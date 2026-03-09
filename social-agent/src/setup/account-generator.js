import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * Génère les informations de compte pour chaque plateforme
 * à partir des infos de marque et des infos supplémentaires
 */
export async function generateAccountProfiles(brandInfo, extraInfo = '') {
  const brandContext = buildBrandContext(brandInfo, extraInfo);

  console.log(chalk.gray('  Génération des profils de compte avec Claude...'));

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Tu es un expert en marketing digital et branding sur les réseaux sociaux.

À partir des informations suivantes sur cette marque/entreprise, génère les profils de compte optimisés pour Instagram, Facebook et TikTok.

${brandContext}

Génère un profil JSON structuré EXACTEMENT dans ce format (sans markdown, juste le JSON pur):
{
  "brand": {
    "name": "nom officiel de la marque",
    "username": "nom_utilisateur_unique_sans_espaces",
    "niche": "niche principale",
    "tone": "ton de communication (ex: professionnel, décontracté, inspirant)",
    "targetAudience": "description de l'audience cible",
    "contentPillars": ["pilier1", "pilier2", "pilier3"],
    "primaryColor": "#hexcode",
    "language": "fr"
  },
  "instagram": {
    "username": "@nom_utilisateur",
    "displayName": "Nom Affiché",
    "bio": "Bio Instagram (150 caractères max, avec émojis, mots-clés, CTA)",
    "website": "url_site",
    "category": "catégorie de compte",
    "highlights": ["Story Highlight 1", "Story Highlight 2", "Story Highlight 3"],
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
  },
  "facebook": {
    "pageName": "Nom de la Page",
    "username": "@nom_utilisateur",
    "bio": "Description courte (255 caractères max)",
    "about": "Description longue pour la section À propos (500 caractères max)",
    "category": "catégorie de page Facebook",
    "website": "url_site",
    "callToAction": "type de CTA (BOOK_NOW, CONTACT_US, SIGN_UP, etc.)"
  },
  "tiktok": {
    "username": "@nom_utilisateur",
    "displayName": "Nom Affiché",
    "bio": "Bio TikTok (80 caractères max, percutante, avec émojis)",
    "website": "url_site",
    "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3"],
    "contentStyle": "style de contenu TikTok (éducatif, divertissant, inspirant, etc.)"
  },
  "accountSetupGuide": {
    "profileImageDescription": "Description précise de l'image de profil idéale pour la marque",
    "coverImageDescription": "Description de l'image de couverture/bannière",
    "manualSteps": {
      "instagram": ["étape1", "étape2", "étape3"],
      "facebook": ["étape1", "étape2", "étape3"],
      "tiktok": ["étape1", "étape2", "étape3"]
    }
  }
}`,
      },
    ],
  });

  const content = response.content[0].text.trim();

  // Nettoyer si markdown présent
  const jsonStr = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(jsonStr);
}

/**
 * Génère le plan de contenu (content pillars et formats)
 */
export async function generateContentPlan(profiles, extraInfo = '') {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [
      {
        role: 'user',
        content: `Tu es un stratège de contenu expert en réseaux sociaux.

Marque: ${profiles.brand.name}
Niche: ${profiles.brand.niche}
Audience: ${profiles.brand.targetAudience}
Ton: ${profiles.brand.tone}
Piliers de contenu: ${profiles.brand.contentPillars.join(', ')}
Infos supplémentaires: ${extraInfo || 'aucune'}

Génère un plan de contenu hebdomadaire JSON EXACTEMENT dans ce format:
{
  "weeklyThemes": {
    "lundi": "thème du lundi",
    "mardi": "thème du mardi",
    "mercredi": "thème du mercredi",
    "jeudi": "thème du jeudi",
    "vendredi": "thème du vendredi",
    "samedi": "thème du samedi",
    "dimanche": "thème du dimanche"
  },
  "dailySchedule": {
    "instagram": [
      {"time": "09:00", "format": "image|carousel|reel|story", "pillar": "pilier"},
      {"time": "13:00", "format": "...", "pillar": "..."},
      {"time": "19:00", "format": "...", "pillar": "..."}
    ],
    "facebook": [
      {"time": "08:00", "format": "text|image|carousel|video|link", "pillar": "pilier"},
      {"time": "12:00", "format": "...", "pillar": "..."},
      {"time": "18:00", "format": "...", "pillar": "..."}
    ],
    "tiktok": [
      {"time": "07:00", "format": "short-video|duet|stitch", "pillar": "pilier"},
      {"time": "15:00", "format": "...", "pillar": "..."},
      {"time": "21:00", "format": "...", "pillar": "..."}
    ]
  },
  "contentMix": {
    "educational": 40,
    "entertaining": 30,
    "promotional": 15,
    "behindTheScenes": 15
  },
  "postingFrequency": {
    "instagram": 3,
    "facebook": 3,
    "tiktok": 3
  }
}`,
      },
    ],
  });

  const content = response.content[0].text.trim();
  const jsonStr = content
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  return JSON.parse(jsonStr);
}

function buildBrandContext(brandInfo, extraInfo) {
  const parts = [];

  if (extraInfo) parts.push(`INFORMATIONS FOURNIES:\n${extraInfo}`);

  if (brandInfo && !brandInfo.error) {
    parts.push(`SITE WEB (${brandInfo.url}):`);
    if (brandInfo.title) parts.push(`Titre: ${brandInfo.title}`);
    if (brandInfo.siteName) parts.push(`Nom du site: ${brandInfo.siteName}`);
    if (brandInfo.description) parts.push(`Description: ${brandInfo.description}`);
    if (brandInfo.keywords) parts.push(`Mots-clés: ${brandInfo.keywords}`);
    if (brandInfo.mainContent) parts.push(`Contenu principal:\n${brandInfo.mainContent}`);
    if (brandInfo.socialLinks && Object.keys(brandInfo.socialLinks).length > 0) {
      parts.push(`Réseaux existants: ${JSON.stringify(brandInfo.socialLinks)}`);
    }
    if (brandInfo.colors?.length) {
      parts.push(`Couleurs de la marque: ${brandInfo.colors.join(', ')}`);
    }
  }

  return parts.join('\n\n');
}
