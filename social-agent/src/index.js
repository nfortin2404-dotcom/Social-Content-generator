#!/usr/bin/env node
import 'dotenv/config';
import chalk from 'chalk';
import figlet from 'figlet';
import boxen from 'boxen';
import { runSetupWizard } from './setup/wizard.js';
import { generateDailyContent } from './content/generator.js';
import { startScheduler } from './content/scheduler.js';
import { publishNow } from './platforms/publisher.js';
import { showStatus } from './utils/status.js';

const command = process.argv[2] || 'menu';

function printBanner() {
  const title = figlet.textSync('Social Agent', { font: 'Small' });
  console.log(chalk.cyan(title));
  console.log(
    boxen(
      chalk.white.bold('Agent IA de publication sociale') + '\n' +
      chalk.gray('Instagram • Facebook • TikTok\n') +
      chalk.gray('Génération & Publication automatique'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'cyan',
        textAlignment: 'center',
      }
    )
  );
}

async function main() {
  printBanner();

  switch (command) {
    case 'setup':
      await runSetupWizard();
      break;

    case 'generate':
      await generateDailyContent();
      break;

    case 'schedule':
      console.log(chalk.green('\n▶ Démarrage du scheduler automatique...'));
      await startScheduler();
      break;

    case 'publish-now':
      await publishNow();
      break;

    case 'status':
      await showStatus();
      break;

    default:
      printHelp();
  }
}

function printHelp() {
  console.log(
    boxen(
      chalk.white.bold('Commandes disponibles\n\n') +
      chalk.cyan('npm run setup') + chalk.gray('        → Assistant de configuration des comptes\n') +
      chalk.cyan('npm run generate') + chalk.gray('     → Générer le contenu du jour\n') +
      chalk.cyan('npm run schedule') + chalk.gray('     → Démarrer le planificateur automatique\n') +
      chalk.cyan('npm run publish-now') + chalk.gray('  → Publier immédiatement un post\n') +
      chalk.cyan('npm run status') + chalk.gray('       → Voir l\'état des publications'),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: 'yellow',
        title: '📱 Social Agent',
        titleAlignment: 'center',
      }
    )
  );
}

main().catch((err) => {
  console.error(chalk.red('\n✗ Erreur:'), err.message);
  process.exit(1);
});
