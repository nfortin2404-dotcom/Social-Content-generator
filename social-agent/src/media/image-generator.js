import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const MEDIA_DIR = process.env.MEDIA_DIR || './data/media';

/**
 * Génère une image via Stability AI
 */
export async function generateImage(prompt, platform = 'instagram') {
  if (!process.env.STABILITY_API_KEY) {
    console.warn('  ⚠ STABILITY_API_KEY manquant, génération d\'image ignorée');
    return null;
  }

  // Dimensions optimales par plateforme
  const dimensions = {
    instagram: { width: 1080, height: 1080 },  // carré
    facebook: { width: 1200, height: 630 },     // bannière
    tiktok: { width: 1080, height: 1920 },      // vertical
  };

  const { width, height } = dimensions[platform] || dimensions.instagram;

  try {
    const response = await axios.post(
      'https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image',
      {
        text_prompts: [
          {
            text: `${prompt}, high quality, professional, social media ready, brand marketing`,
            weight: 1,
          },
          {
            text: 'blurry, low quality, text, watermark, ugly, distorted',
            weight: -1,
          },
        ],
        cfg_scale: 7,
        height,
        width,
        steps: 30,
        samples: 1,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }
    );

    const imageData = response.data.artifacts[0];
    const buffer = Buffer.from(imageData.base64, 'base64');

    // Sauvegarder l'image
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const filename = `${platform}_${uuidv4()}.png`;
    const filepath = path.join(MEDIA_DIR, filename);
    fs.writeFileSync(filepath, buffer);

    return filepath;
  } catch (err) {
    console.warn(`  ⚠ Génération image échouée: ${err.message}`);
    return null;
  }
}

/**
 * Télécharge une image depuis une URL et la sauvegarde localement
 */
export async function downloadImage(url) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
    const filename = `downloaded_${uuidv4()}.${ext}`;
    const filepath = path.join(MEDIA_DIR, filename);
    fs.writeFileSync(filepath, response.data);
    return filepath;
  } catch (err) {
    throw new Error(`Impossible de télécharger l'image: ${err.message}`);
  }
}

/**
 * Crée une image placeholder avec texte (sans API externe)
 */
export async function createPlaceholderImage(text, platform = 'instagram') {
  // Retourne null si sharp non disponible, le publisher gèrera
  try {
    const sharp = (await import('sharp')).default;
    const dimensions = {
      instagram: { width: 1080, height: 1080 },
      facebook: { width: 1200, height: 630 },
      tiktok: { width: 1080, height: 1920 },
    };
    const { width, height } = dimensions[platform] || dimensions.instagram;

    fs.mkdirSync(MEDIA_DIR, { recursive: true });
    const filename = `placeholder_${platform}_${uuidv4()}.png`;
    const filepath = path.join(MEDIA_DIR, filename);

    await sharp({
      create: {
        width,
        height,
        channels: 4,
        background: { r: 30, g: 30, b: 50, alpha: 1 },
      },
    })
      .png()
      .toFile(filepath);

    return filepath;
  } catch {
    return null;
  }
}
