import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import dayjs from 'dayjs';
import { InstagramPublisher } from './instagram.js';
import { FacebookPublisher } from './facebook.js';
import { TikTokPublisher } from './tiktok.js';
import { loadPosts, updatePostStatus, loadConfig } from '../utils/storage.js';
import { generateDailyContent } from '../content/generator.js';
import { generateImage } from '../media/image-generator.js';

const PLATFORM_COLORS = {
  instagram: chalk.magenta,
  facebook: chalk.blue,
  tiktok: chalk.red,
};

/**
 * Publie immédiatement via sélection interactive
 */
export async function publishNow() {
  const today = dayjs().format('YYYY-MM-DD');
  let posts = loadPosts(today);

  if (!posts?.length) {
    console.log(chalk.yellow('\n⚠ Aucun post généré pour aujourd\'hui.'));
    const { generate } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'generate',
        message: 'Générer le contenu maintenant ?',
        default: true,
      },
    ]);
    if (generate) {
      posts = await generateDailyContent();
    } else {
      return;
    }
  }

  const pendingPosts = posts.filter((p) => p.status === 'pending');

  if (!pendingPosts.length) {
    console.log(chalk.green('\n✓ Tous les posts ont déjà été publiés.'));
    return;
  }

  // Sélection du post à publier
  const { selectedPosts } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedPosts',
      message: 'Sélectionnez les posts à publier maintenant:',
      choices: pendingPosts.map((post) => ({
        name: `[${post.platform.toUpperCase()}] ${post.scheduledTime?.split('T')[1]?.substring(0, 5)} — ${post.format} — ${post.caption?.substring(0, 60)}...`,
        value: post.id,
        checked: false,
      })),
    },
  ]);

  if (!selectedPosts.length) {
    console.log(chalk.gray('\nAucun post sélectionné.'));
    return;
  }

  const toPublish = pendingPosts.filter((p) => selectedPosts.includes(p.id));
  await publishPosts(toPublish);
}

/**
 * Publie une liste de posts
 */
export async function publishPosts(posts) {
  const publishers = createPublishers();
  let successCount = 0;
  let failCount = 0;

  for (const post of posts) {
    const color = PLATFORM_COLORS[post.platform] || chalk.white;
    const spinner = ora(`Publier sur ${color(post.platform.toUpperCase())} — ${post.format}`).start();

    try {
      // Générer l'image si nécessaire et non disponible
      if (needsImage(post) && !post.imageUrl && !post.imageLocalPath && post.visualPrompt) {
        spinner.text = `Génération de l'image pour ${post.platform}...`;
        post.imageUrl = await generateImage(post.visualPrompt, post.platform);
      }

      const publisher = publishers[post.platform];
      if (!publisher) {
        throw new Error(`Publisher non disponible pour ${post.platform}`);
      }

      const result = await publisher.publish(post);

      // Épingler le premier commentaire si défini (Instagram)
      if (post.platform === 'instagram' && post.firstComment && result?.id) {
        try {
          await publisher.addComment(result.id, post.firstComment);
        } catch {
          // Non critique
        }
      }

      updatePostStatus(post.id, post.date, 'published', {
        publishedAt: new Date().toISOString(),
        platformResponse: result,
      });

      spinner.succeed(color(`✓ Publié sur ${post.platform.toUpperCase()} — ${post.format} (${post.pillar})`));
      successCount++;

    } catch (err) {
      updatePostStatus(post.id, post.date, 'failed', { error: err.message });
      spinner.fail(chalk.red(`✗ Échec ${post.platform.toUpperCase()}: ${err.message}`));
      failCount++;
    }

    // Délai entre publications pour respecter les rate limits
    if (posts.indexOf(post) < posts.length - 1) {
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  console.log(
    chalk.white('\n📊 Résultat: ') +
    chalk.green(`${successCount} publiés`) +
    (failCount ? chalk.red(`, ${failCount} échoués`) : '')
  );

  return { successCount, failCount };
}

/**
 * Publie tous les posts planifiés pour maintenant (appelé par le scheduler)
 */
export async function publishScheduledPosts() {
  const today = dayjs().format('YYYY-MM-DD');
  const now = dayjs();
  const posts = loadPosts(today) || [];

  const dueNow = posts.filter((post) => {
    if (post.status !== 'pending') return false;
    const scheduled = dayjs(post.scheduledTime);
    // Publier si l'heure est dans la fenêtre des 5 minutes
    return Math.abs(scheduled.diff(now, 'minute')) <= 5;
  });

  if (dueNow.length > 0) {
    console.log(chalk.cyan(`\n⏰ ${dueNow.length} post(s) à publier maintenant...`));
    await publishPosts(dueNow);
  }

  return dueNow.length;
}

function createPublishers() {
  const publishers = {};

  try {
    publishers.instagram = new InstagramPublisher();
  } catch (err) {
    console.warn(chalk.yellow(`⚠ Instagram désactivé: ${err.message}`));
  }

  try {
    publishers.facebook = new FacebookPublisher();
  } catch (err) {
    console.warn(chalk.yellow(`⚠ Facebook désactivé: ${err.message}`));
  }

  try {
    publishers.tiktok = new TikTokPublisher();
  } catch (err) {
    console.warn(chalk.yellow(`⚠ TikTok désactivé: ${err.message}`));
  }

  return publishers;
}

function needsImage(post) {
  return ['image', 'carousel', 'infographic', 'story'].includes(post.format);
}
