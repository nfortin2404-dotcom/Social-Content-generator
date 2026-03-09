import chalk from 'chalk';
import boxen from 'boxen';
import dayjs from 'dayjs';
import { loadConfig, getPostStats, getAllPostDates } from './storage.js';

export async function showStatus() {
  const config = loadConfig();
  const today = dayjs().format('YYYY-MM-DD');
  const stats = getPostStats(today);
  const dates = getAllPostDates();

  console.log('\n' + boxen(
    chalk.white.bold('📊 État du Social Agent\n\n') +

    // Config
    (config?.brand
      ? chalk.green('✓ Configuré: ') + chalk.white(config.brand.name) + '\n' +
        chalk.gray(`  Niche: ${config.brand.niche}\n`) +
        chalk.gray(`  Plateforme: Instagram, Facebook, TikTok\n`)
      : chalk.red('✗ Non configuré — lancez: npm run setup\n')) +

    '\n' + chalk.cyan('─── Aujourd\'hui (' + today + ') ───\n') +

    chalk.white(`Total posts: ${stats.total}\n`) +
    chalk.green(`✓ Publiés: ${stats.published}\n`) +
    chalk.yellow(`⏳ En attente: ${stats.pending}\n`) +
    (stats.failed ? chalk.red(`✗ Échoués: ${stats.failed}\n`) : '') +

    '\n' + chalk.cyan('─── Par plateforme ───\n') +
    formatPlatformStats('Instagram', stats.byPlatform.instagram, chalk.magenta) +
    formatPlatformStats('Facebook', stats.byPlatform.facebook, chalk.blue) +
    formatPlatformStats('TikTok', stats.byPlatform.tiktok, chalk.red) +

    '\n' + chalk.cyan('─── APIs ───\n') +
    checkApi('Claude (Anthropic)', process.env.ANTHROPIC_API_KEY) +
    checkApi('Meta (Instagram+Facebook)', process.env.META_ACCESS_TOKEN) +
    checkApi('TikTok', process.env.TIKTOK_ACCESS_TOKEN) +
    checkApi('Stability AI (images)', process.env.STABILITY_API_KEY),

    {
      padding: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      title: '🤖 Social Agent Status',
      titleAlignment: 'center',
    }
  ));

  if (dates.length > 1) {
    console.log(chalk.gray('\nHistorique des publications:'));
    dates.slice(0, 7).forEach((date) => {
      const s = getPostStats(date);
      const bar = '█'.repeat(s.published) + '░'.repeat(Math.max(0, s.total - s.published));
      console.log(chalk.gray(`  ${date}: ${bar} ${s.published}/${s.total}`));
    });
  }
}

function formatPlatformStats(name, posts, colorFn) {
  if (!posts?.length) return colorFn(`  ${name}: aucun post\n`);
  const pub = posts.filter((p) => p.status === 'published').length;
  const formats = [...new Set(posts.map((p) => p.format))].join(', ');
  return colorFn(`  ${name}: ${pub}/${posts.length} publiés`) +
    chalk.gray(` [${formats}]\n`);
}

function checkApi(name, key) {
  return key
    ? chalk.green(`  ✓ ${name}\n`)
    : chalk.red(`  ✗ ${name} — manquant dans .env\n`);
}
