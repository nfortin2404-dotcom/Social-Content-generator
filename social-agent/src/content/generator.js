import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import ora from 'ora';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { loadConfig, savePosts, loadPosts } from '../utils/storage.js';
import { generateImage } from '../media/image-generator.js';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PLATFORMS = ['instagram', 'facebook', 'tiktok'];

const PLATFORM_SPECS = {
  instagram: {
    maxCaption: 2200,
    maxHashtags: 30,
    formats: ['image', 'carousel', 'reel', 'story'],
    notes: 'Utiliser des émojis, fort visuel, hashtags en fin de caption. Stories éphémères séparées.',
  },
  facebook: {
    maxCaption: 63206,
    maxHashtags: 10,
    formats: ['text', 'image', 'carousel', 'video', 'link'],
    notes: 'Plus conversationnel, encourage les partages et commentaires. Links autorisés.',
  },
  tiktok: {
    maxCaption: 2200,
    maxHashtags: 10,
    formats: ['short-video', 'story'],
    notes: 'Accroche en 1-3 sec, très direct, tendances, musique suggérée. Court et percutant.',
  },
};

const FORMAT_INSTRUCTIONS = {
  image: 'Post photo unique avec caption engageante',
  carousel: 'Carrousel 5-10 slides: slide 1=accroche, slides 2-9=contenu, slide finale=CTA',
  reel: 'Script vidéo courte 15-60s: accroche (3s), contenu, CTA final',
  'short-video': 'Script TikTok 15-60s: hook immédiat, valeur rapide, CTA clair',
  story: 'Story séquentielle interactive (sondage/question suggéré)',
  text: 'Post texte engageant, storytelling ou question',
  infographic: 'Description détaillée d\'une infographie à créer',
  interactive: 'Sondage ou quiz avec 2-4 options',
};

/**
 * Génère le contenu complet pour la journée
 */
export async function generateDailyContent(targetDate = null) {
  const config = loadConfig();
  if (!config?.brand) {
    throw new Error('Configuration manquante. Lancez d\'abord: npm run setup');
  }

  const date = targetDate || dayjs().format('YYYY-MM-DD');
  console.log(chalk.cyan(`\n📅 Génération du contenu pour le ${date}\n`));

  const spinner = ora('Génération en cours...').start();
  const allPosts = [];

  for (const platform of PLATFORMS) {
    const postsPerDay = config.settings?.postsPerDay || 3;
    spinner.text = `Génération des posts ${platform} (${postsPerDay} posts)...`;

    const schedule = config.contentPlan?.dailySchedule?.[platform] || getDefaultSchedule(platform, postsPerDay);

    for (let i = 0; i < postsPerDay; i++) {
      const slot = schedule[i] || schedule[i % schedule.length];
      const pillar = slot.pillar || config.brand.contentPillars[i % config.brand.contentPillars.length];
      const format = slot.format || 'image';

      try {
        const post = await generatePost({
          platform,
          format,
          pillar,
          date,
          slot,
          config,
          index: i,
        });
        allPosts.push(post);
      } catch (err) {
        spinner.warn(chalk.yellow(`Erreur post ${platform} #${i + 1}: ${err.message}`));
      }
    }
  }

  savePosts(date, allPosts);
  spinner.succeed(chalk.green(`✓ ${allPosts.length} posts générés pour le ${date}`));

  displayPostsSummary(allPosts);
  return allPosts;
}

/**
 * Génère un seul post
 */
async function generatePost({ platform, format, pillar, date, slot, config, index }) {
  const spec = PLATFORM_SPECS[platform];
  const formatInstr = FORMAT_INSTRUCTIONS[format] || FORMAT_INSTRUCTIONS.image;
  const dayOfWeek = dayjs(date).locale('fr').format('dddd');
  const weeklyTheme = config.contentPlan?.weeklyThemes?.[dayOfWeek.toLowerCase()] || '';

  const prompt = `Tu es un expert en marketing digital et création de contenu pour les réseaux sociaux.

MARQUE: ${config.brand.name}
NICHE: ${config.brand.niche}
AUDIENCE: ${config.brand.targetAudience}
TON: ${config.brand.tone}
LANGUE: ${config.brand.language || 'fr'}
CTA: ${config.settings?.callToAction || ''}
SITE WEB: ${config.settings?.websiteUrl || ''}

PLATEFORME: ${platform.toUpperCase()}
FORMAT: ${format} — ${formatInstr}
PILIER: ${pillar}
THÈME DU JOUR: ${weeklyTheme || pillar}
HEURE DE PUBLICATION: ${slot.time}
CONTRAINTES: max ${spec.maxCaption} caractères, max ${spec.maxHashtags} hashtags
NOTES SPÉCIALES: ${spec.notes}

Génère un post JSON EXACT sans markdown:
{
  "caption": "texte complet du post avec émojis appropriés",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "visualDescription": "description précise et détaillée du visuel à créer (pour génération IA)",
  "visualPrompt": "prompt DALL-E/Stable Diffusion en anglais pour l'image",
  "altText": "texte alternatif accessibilité pour l'image",
  "slideContent": [
    {"slide": 1, "title": "titre", "text": "contenu", "visual": "description visuel"},
    {"slide": 2, "title": "titre", "text": "contenu", "visual": "description visuel"}
  ],
  "videoScript": {
    "hook": "accroche 0-3 secondes",
    "body": "contenu principal 3-50 secondes",
    "cta": "appel à l'action final",
    "music": "style musical suggéré",
    "captions": ["caption on-screen 1", "caption on-screen 2"]
  },
  "storyContent": {
    "frame1": "contenu de la story",
    "interactive": "type d'interaction: sondage/question/quiz",
    "options": ["option1", "option2"]
  },
  "firstComment": "premier commentaire à épingler (pour Instagram, optionnel)",
  "scheduledTime": "${slot.time}",
  "engagementTip": "conseil pour maximiser l'engagement sur ce post"
}

Note: remplis seulement les champs pertinents pour le format "${format}". Les champs non pertinents peuvent être null.`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const content = response.content[0].text.trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const postData = JSON.parse(content);

  return {
    id: uuidv4(),
    platform,
    format,
    pillar,
    date,
    scheduledTime: `${date}T${slot.time}:00`,
    status: 'pending',
    ...postData,
    metadata: {
      generatedAt: new Date().toISOString(),
      brand: config.brand.name,
      index,
    },
  };
}

/**
 * Génère un post unique avec description personnalisée
 */
export async function generateSinglePost({ platform, format, topic, customInstructions = '' }) {
  const config = loadConfig();
  if (!config?.brand) throw new Error('Configuration manquante');

  const date = dayjs().format('YYYY-MM-DD');
  const slot = { time: '12:00', pillar: 'custom' };

  const post = await generatePost({
    platform,
    format,
    pillar: topic,
    date,
    slot: { ...slot, customInstructions },
    config,
    index: 0,
  });

  // Générer l'image si besoin
  if (post.visualPrompt && ['image', 'carousel', 'infographic'].includes(format)) {
    try {
      post.imageUrl = await generateImage(post.visualPrompt, platform);
    } catch {
      // Image gen optionnelle
    }
  }

  return post;
}

function displayPostsSummary(posts) {
  console.log('\n' + chalk.white.bold('📋 Résumé des posts générés:\n'));

  for (const platform of PLATFORMS) {
    const platformPosts = posts.filter((p) => p.platform === platform);
    console.log(chalk.cyan(`${platform.toUpperCase()} (${platformPosts.length} posts):`));
    platformPosts.forEach((post) => {
      const time = post.scheduledTime?.split('T')[1]?.substring(0, 5) || '??:??';
      const caption = post.caption?.substring(0, 60) + '...' || '';
      console.log(chalk.gray(`  ${time} [${post.format}] ${post.pillar} — ${caption}`));
    });
    console.log();
  }
}

function getDefaultSchedule(platform, count) {
  const schedules = {
    instagram: [
      { time: '09:00', format: 'image', pillar: 'éducatif' },
      { time: '13:00', format: 'carousel', pillar: 'conseils' },
      { time: '19:00', format: 'reel', pillar: 'engagement' },
      { time: '21:00', format: 'story', pillar: 'coulisses' },
    ],
    facebook: [
      { time: '08:00', format: 'text', pillar: 'éducatif' },
      { time: '12:00', format: 'image', pillar: 'conseils' },
      { time: '18:00', format: 'carousel', pillar: 'engagement' },
      { time: '20:00', format: 'video', pillar: 'promotionnel' },
    ],
    tiktok: [
      { time: '07:00', format: 'short-video', pillar: 'éducatif' },
      { time: '15:00', format: 'short-video', pillar: 'divertissant' },
      { time: '21:00', format: 'short-video', pillar: 'tendance' },
      { time: '23:00', format: 'short-video', pillar: 'engagement' },
    ],
  };
  return schedules[platform].slice(0, count);
}
