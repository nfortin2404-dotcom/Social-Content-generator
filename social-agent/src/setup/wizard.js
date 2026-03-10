import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import boxen from 'boxen';
import { scrapeBrandInfo } from './brand-scraper.js';
import { generateAccountProfiles, generateContentPlan } from './account-generator.js';
import { saveConfig, loadConfig } from '../utils/storage.js';

export async function runSetupWizard() {
  console.log('\n' + chalk.cyan.bold('🚀 Assistant de configuration\n'));
  console.log(chalk.gray('Cet assistant va créer les profils de comptes pour Instagram, Facebook et TikTok.\n'));

  // Vérifier config existante
  const existing = loadConfig();
  if (existing?.brand?.name) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Une configuration pour "${existing.brand.name}" existe déjà. Recommencer ?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.green('\n✓ Configuration existante conservée.'));
      await showAccountSetupGuide(existing);
      return;
    }
  }

  // Étape 1: Informations de base
  console.log(chalk.yellow('\n📋 Étape 1/4 — Informations de base\n'));
  const basicInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'websiteUrl',
      message: 'URL de votre site web (optionnel, appuyez Entrée pour passer):',
      validate: (input) => {
        if (!input) return true;
        try { new URL(input); return true; }
        catch { return 'URL invalide. Ex: https://monsite.com'; }
      },
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Décrivez votre marque/entreprise (qui vous êtes, ce que vous faites, votre mission):',
    },
    {
      type: 'input',
      name: 'niche',
      message: 'Votre niche/secteur (ex: fitness, cuisine, technologie, mode):',
      validate: (i) => i.trim() ? true : 'Requis',
    },
    {
      type: 'list',
      name: 'language',
      message: 'Langue principale du contenu:',
      choices: [
        { name: '🇫🇷 Français', value: 'fr' },
        { name: '🇬🇧 English', value: 'en' },
        { name: '🇪🇸 Español', value: 'es' },
        { name: '🇧🇷 Português', value: 'pt' },
      ],
      default: 'fr',
    },
  ]);

  // Étape 2: Audience et ton
  console.log(chalk.yellow('\n👥 Étape 2/4 — Audience et stratégie\n'));
  const strategyInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetAudience',
      message: 'Décrivez votre audience cible (âge, intérêts, besoins):',
      validate: (i) => i.trim() ? true : 'Requis',
    },
    {
      type: 'list',
      name: 'tone',
      message: 'Ton de communication:',
      choices: [
        { name: '💼 Professionnel et expert', value: 'professionnel' },
        { name: '😊 Accessible et décontracté', value: 'décontracté' },
        { name: '⚡ Dynamique et motivant', value: 'dynamique' },
        { name: '🎨 Créatif et inspirant', value: 'créatif' },
        { name: '📚 Éducatif et informatif', value: 'éducatif' },
        { name: '😄 Humoristique et divertissant', value: 'humoristique' },
      ],
    },
    {
      type: 'checkbox',
      name: 'contentPillars',
      message: 'Piliers de contenu (choisir 3-5):',
      choices: [
        { name: '📖 Éducatif / Tutoriels', value: 'éducatif', checked: true },
        { name: '💡 Conseils et astuces', value: 'conseils', checked: true },
        { name: '🎭 Coulisses / Behind the scenes', value: 'coulisses' },
        { name: '🏆 Témoignages / Succès clients', value: 'témoignages', checked: true },
        { name: '📣 Promotionnel / Offres', value: 'promotionnel' },
        { name: '💬 Questions / Engagement', value: 'engagement' },
        { name: '🌟 Inspiration / Motivation', value: 'inspiration' },
        { name: '📰 Actualités secteur', value: 'actualités' },
        { name: '🔧 Produits / Services', value: 'produits' },
      ],
      validate: (choices) => choices.length >= 2 ? true : 'Choisir au moins 2 piliers',
    },
  ]);

  // Étape 3: Objectifs et plateformes
  console.log(chalk.yellow('\n🎯 Étape 3/4 — Objectifs et formats\n'));
  const platformInfo = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'goals',
      message: 'Objectifs principaux:',
      choices: [
        { name: '📈 Augmenter la notoriété', value: 'brand_awareness', checked: true },
        { name: '🛒 Générer des ventes', value: 'sales' },
        { name: '👥 Construire une communauté', value: 'community', checked: true },
        { name: '🔗 Générer du trafic web', value: 'traffic' },
        { name: '📧 Collecter des leads', value: 'leads' },
        { name: '💰 Monétiser via partenariats', value: 'monetization' },
      ],
    },
    {
      type: 'checkbox',
      name: 'contentFormats',
      message: 'Formats de contenu prioritaires:',
      choices: [
        { name: '🖼️ Photos / Images', value: 'image', checked: true },
        { name: '🎬 Vidéos courtes (Reels/TikTok)', value: 'short-video', checked: true },
        { name: '📊 Carrousels (diaporamas)', value: 'carousel', checked: true },
        { name: '📝 Posts texte', value: 'text', checked: true },
        { name: '📺 Vidéos longues', value: 'long-video' },
        { name: '🗳️ Sondages / Quiz', value: 'interactive' },
        { name: '🎞️ Stories éphémères', value: 'story', checked: true },
        { name: '🎨 Infographies', value: 'infographic' },
      ],
    },
    {
      type: 'number',
      name: 'postsPerDay',
      message: 'Nombre de posts par plateforme par jour:',
      default: 3,
      validate: (n) => n >= 3 ? true : 'Minimum 3 posts par jour',
    },
  ]);

  // Étape 4: Informations supplémentaires
  console.log(chalk.yellow('\n➕ Étape 4/4 — Infos complémentaires\n'));
  const extraInfo = await inquirer.prompt([
    {
      type: 'input',
      name: 'hashtags',
      message: 'Hashtags de marque (séparés par des virgules, optionnel):',
    },
    {
      type: 'input',
      name: 'competitors',
      message: 'Comptes concurrents à surveiller (@compte1, @compte2, optionnel):',
    },
    {
      type: 'input',
      name: 'callToAction',
      message: 'CTA principal (ex: "Visitez notre site", "Réservez maintenant"):',
    },
    {
      type: 'editor',
      name: 'additionalInfo',
      message: 'Informations supplémentaires sur votre marque (produits, valeurs, USP — optionnel):',
    },
  ]);

  // Compilation des infos
  const userInput = { ...basicInfo, ...strategyInfo, ...platformInfo, ...extraInfo };
  const extraText = buildExtraText(userInput);

  // Scraping du site web
  let brandInfo = {};
  if (basicInfo.websiteUrl) {
    const spinner = ora('Analyse du site web...').start();
    try {
      brandInfo = await scrapeBrandInfo(basicInfo.websiteUrl);
      spinner.succeed(chalk.green('Site web analysé'));
    } catch (err) {
      spinner.fail(chalk.yellow('Impossible d\'analyser le site'));
      brandInfo = { url: basicInfo.websiteUrl, error: err.message };
    }
  }

  // Génération des profils avec Claude
  const spinner = ora('Génération des profils de comptes avec Claude AI...').start();
  try {
    const profiles = await generateAccountProfiles(brandInfo, extraText);
    const contentPlan = await generateContentPlan(profiles, extraText);

    // Sauvegarder la configuration
    const config = {
      ...profiles,
      contentPlan,
      settings: {
        postsPerDay: userInput.postsPerDay,
        contentFormats: userInput.contentFormats,
        goals: userInput.goals,
        language: userInput.language,
        timezone: process.env.TIMEZONE || 'America/Montreal',
        hashtags: userInput.hashtags?.split(',').map((h) => h.trim()).filter(Boolean) || [],
        callToAction: userInput.callToAction,
        websiteUrl: basicInfo.websiteUrl,
      },
      createdAt: new Date().toISOString(),
    };

    saveConfig(config);
    spinner.succeed(chalk.green('Profils générés avec succès !'));

    // Afficher le résumé
    displayProfileSummary(config);

    // Guide de création manuelle
    await showAccountSetupGuide(config);

    console.log(
      boxen(
        chalk.green.bold('✓ Configuration terminée !\n\n') +
        chalk.white('Prochaines étapes:\n') +
        chalk.cyan('1. ') + chalk.white('Créer vos comptes (guide ci-dessus)\n') +
        chalk.cyan('2. ') + chalk.white('Configurer les API dans .env\n') +
        chalk.cyan('3. ') + chalk.white('npm run generate  →  Générer le contenu du jour\n') +
        chalk.cyan('4. ') + chalk.white('npm run schedule  →  Démarrer l\'auto-publication'),
        { padding: 1, borderStyle: 'round', borderColor: 'green' }
      )
    );

  } catch (err) {
    spinner.fail(chalk.red('Erreur lors de la génération'));
    throw err;
  }
}

function displayProfileSummary(config) {
  const { brand, instagram, facebook, tiktok } = config;

  console.log('\n' + boxen(
    chalk.white.bold(`📊 Profils générés pour: ${brand.name}\n\n`) +
    chalk.cyan('INSTAGRAM\n') +
    chalk.white(`  Nom: ${instagram.displayName}\n`) +
    chalk.white(`  Username: ${instagram.username}\n`) +
    chalk.gray(`  Bio: ${instagram.bio}\n\n`) +
    chalk.blue('FACEBOOK\n') +
    chalk.white(`  Page: ${facebook.pageName}\n`) +
    chalk.white(`  Username: ${facebook.username}\n`) +
    chalk.gray(`  Bio: ${facebook.bio}\n\n`) +
    chalk.red('TIKTOK\n') +
    chalk.white(`  Nom: ${tiktok.displayName}\n`) +
    chalk.white(`  Username: ${tiktok.username}\n`) +
    chalk.gray(`  Bio: ${tiktok.bio}`),
    { padding: 1, borderStyle: 'double', borderColor: 'cyan', title: '✨ Profils', titleAlignment: 'center' }
  ));
}

async function showAccountSetupGuide(config) {
  const guide = config.accountSetupGuide;
  if (!guide) return;

  console.log('\n' + chalk.yellow.bold('📖 Guide de création de comptes\n'));

  console.log(chalk.white('Image de profil recommandée:'));
  console.log(chalk.gray(`  ${guide.profileImageDescription}\n`));

  if (guide.coverImageDescription) {
    console.log(chalk.white('Image de couverture/bannière:'));
    console.log(chalk.gray(`  ${guide.coverImageDescription}\n`));
  }

  for (const [platform, steps] of Object.entries(guide.manualSteps || {})) {
    console.log(chalk.cyan(`\n${platform.toUpperCase()}:`));
    steps.forEach((step, i) => {
      console.log(chalk.gray(`  ${i + 1}. ${step}`));
    });
  }
}

function buildExtraText(input) {
  const parts = [];
  parts.push(`Description: ${input.description}`);
  parts.push(`Niche: ${input.niche}`);
  parts.push(`Audience: ${input.targetAudience}`);
  parts.push(`Ton: ${input.tone}`);
  parts.push(`Piliers: ${input.contentPillars.join(', ')}`);
  parts.push(`Objectifs: ${input.goals.join(', ')}`);
  parts.push(`Formats: ${input.contentFormats.join(', ')}`);
  if (input.hashtags) parts.push(`Hashtags: ${input.hashtags}`);
  if (input.callToAction) parts.push(`CTA: ${input.callToAction}`);
  if (input.additionalInfo) parts.push(`Infos supplémentaires: ${input.additionalInfo}`);
  return parts.join('\n');
}
