import cron from 'node-cron';
import chalk from 'chalk';
import dayjs from 'dayjs';
import { generateDailyContent } from './generator.js';
import { publishScheduledPosts } from '../platforms/publisher.js';
import { loadConfig } from '../utils/storage.js';

let isRunning = false;

/**
 * Démarre le scheduler automatique
 * - Génère le contenu chaque jour à minuit
 * - Vérifie les posts à publier toutes les 5 minutes
 */
export async function startScheduler() {
  const config = loadConfig();
  if (!config?.brand) {
    throw new Error('Configuration manquante. Lancez d\'abord: npm run setup');
  }

  const tz = process.env.TIMEZONE || 'America/Montreal';

  console.log(chalk.cyan(`\n⏰ Scheduler démarré (timezone: ${tz})`));
  console.log(chalk.gray('  • Génération du contenu: tous les jours à 23:45'));
  console.log(chalk.gray('  • Vérification des publications: toutes les 5 minutes'));
  console.log(chalk.gray('  • Appuyez Ctrl+C pour arrêter\n'));

  // Générer le contenu du lendemain chaque jour à 23:45
  cron.schedule('45 23 * * *', async () => {
    if (isRunning) return;
    isRunning = true;
    const tomorrow = dayjs().add(1, 'day').format('YYYY-MM-DD');
    console.log(chalk.cyan(`\n📅 Génération du contenu pour ${tomorrow}...`));
    try {
      await generateDailyContent(tomorrow);
      console.log(chalk.green('✓ Contenu du lendemain prêt'));
    } catch (err) {
      console.error(chalk.red('✗ Erreur génération:', err.message));
    } finally {
      isRunning = false;
    }
  }, { timezone: tz });

  // Vérifier les posts à publier toutes les 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const count = await publishScheduledPosts();
      if (count > 0) {
        console.log(chalk.green(`✓ ${count} post(s) publiés à ${dayjs().format('HH:mm')}`));
      }
    } catch (err) {
      console.error(chalk.red('✗ Erreur publication:', err.message));
    }
  }, { timezone: tz });

  // Rapport quotidien à 22:00
  cron.schedule('0 22 * * *', () => {
    printDailyReport();
  }, { timezone: tz });

  // Générer le contenu d'aujourd'hui si pas encore fait
  const today = dayjs().format('YYYY-MM-DD');
  const { loadPosts } = await import('../utils/storage.js');
  const existing = loadPosts(today);

  if (!existing?.length) {
    console.log(chalk.yellow("⚡ Génération du contenu d'aujourd'hui..."));
    try {
      await generateDailyContent(today);
    } catch (err) {
      console.error(chalk.red('✗ Erreur génération initiale:', err.message));
    }
  } else {
    console.log(chalk.green(`✓ ${existing.length} posts déjà générés pour aujourd'hui`));
  }

  // Garder le processus actif
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Scheduler arrêté.'));
    process.exit(0);
  });

  // Loop infini
  await new Promise(() => {});
}

function printDailyReport() {
  const today = dayjs().format('YYYY-MM-DD');
  import('../utils/storage.js').then(({ loadPosts }) => {
    const posts = loadPosts(today) || [];
    const published = posts.filter((p) => p.status === 'published').length;
    const failed = posts.filter((p) => p.status === 'failed').length;
    const pending = posts.filter((p) => p.status === 'pending').length;

    const byPlatform = ['instagram', 'facebook', 'tiktok'].map((p) => {
      const platformPosts = posts.filter((post) => post.platform === p);
      const pub = platformPosts.filter((post) => post.status === 'published').length;
      return `${p}: ${pub}/${platformPosts.length}`;
    }).join(', ');

    console.log(chalk.cyan(`\n📊 Rapport du ${today}:`));
    console.log(chalk.white(`  Publiés: ${published} | Échoués: ${failed} | En attente: ${pending}`));
    console.log(chalk.gray(`  ${byPlatform}`));
  });
}
