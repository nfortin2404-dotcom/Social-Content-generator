import axios from 'axios';
import fs from 'fs';

const BASE_URL = 'https://graph.facebook.com/v21.0';

/**
 * Publie un post sur Instagram via Meta Graph API
 * Nécessite un compte Business/Creator connecté à une Facebook Page
 */
export class InstagramPublisher {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.accountId = process.env.INSTAGRAM_BUSINESS_ACCOUNT_ID;

    if (!this.accessToken || !this.accountId) {
      throw new Error('META_ACCESS_TOKEN et INSTAGRAM_BUSINESS_ACCOUNT_ID requis dans .env');
    }
  }

  /**
   * Publie selon le format du post
   */
  async publish(post) {
    switch (post.format) {
      case 'image':
        return this.publishImage(post);
      case 'carousel':
        return this.publishCarousel(post);
      case 'reel':
        return this.publishReel(post);
      case 'story':
        return this.publishStory(post);
      default:
        return this.publishImage(post);
    }
  }

  /**
   * Post image unique
   */
  async publishImage(post) {
    if (!post.imageUrl && !post.imageLocalPath) {
      throw new Error('Image requise pour un post Instagram');
    }

    // Étape 1: Créer le média container
    const containerParams = {
      image_url: post.imageUrl,
      caption: this.formatCaption(post),
      access_token: this.accessToken,
    };

    // Si fichier local, il faut l'uploader via une URL publique
    // En production, uploader sur S3/CDN d'abord
    if (post.imageLocalPath && !post.imageUrl) {
      throw new Error('Les images locales nécessitent une URL publique (uploadez sur S3/CDN)');
    }

    const container = await this.createMediaContainer(containerParams);

    // Étape 2: Attendre que le média soit prêt
    await this.waitForMedia(container.id);

    // Étape 3: Publier
    return this.publishContainer(container.id);
  }

  /**
   * Carrousel (plusieurs images)
   */
  async publishCarousel(post) {
    if (!post.carouselImages?.length) {
      throw new Error('Images requises pour un carrousel');
    }

    // Créer un container par image
    const itemIds = [];
    for (const imageUrl of post.carouselImages) {
      const item = await this.apiRequest('POST', `/${this.accountId}/media`, {
        image_url: imageUrl,
        is_carousel_item: true,
      });
      await this.waitForMedia(item.id);
      itemIds.push(item.id);
    }

    // Créer le container carrousel
    const container = await this.createMediaContainer({
      media_type: 'CAROUSEL',
      children: itemIds.join(','),
      caption: this.formatCaption(post),
    });

    await this.waitForMedia(container.id);
    return this.publishContainer(container.id);
  }

  /**
   * Reel (vidéo courte)
   */
  async publishReel(post) {
    if (!post.videoUrl) {
      throw new Error('URL vidéo requise pour un Reel');
    }

    const container = await this.createMediaContainer({
      media_type: 'REELS',
      video_url: post.videoUrl,
      caption: this.formatCaption(post),
      share_to_feed: true,
    });

    await this.waitForMedia(container.id);
    return this.publishContainer(container.id);
  }

  /**
   * Story
   */
  async publishStory(post) {
    if (!post.imageUrl && !post.videoUrl) {
      throw new Error('Image ou vidéo requise pour une Story');
    }

    const params = {
      media_type: 'STORIES',
      caption: post.caption?.substring(0, 150) || '',
    };

    if (post.videoUrl) {
      params.video_url = post.videoUrl;
    } else {
      params.image_url = post.imageUrl;
    }

    const container = await this.createMediaContainer(params);
    await this.waitForMedia(container.id);
    return this.publishContainer(container.id);
  }

  async createMediaContainer(params) {
    return this.apiRequest('POST', `/${this.accountId}/media`, params);
  }

  async publishContainer(containerId) {
    return this.apiRequest('POST', `/${this.accountId}/media_publish`, {
      creation_id: containerId,
    });
  }

  async waitForMedia(mediaId, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.apiRequest('GET', `/${mediaId}`, {
        fields: 'status_code',
      });

      if (status.status_code === 'FINISHED') return;
      if (status.status_code === 'ERROR') {
        throw new Error(`Erreur traitement média Instagram: ${status.status_code}`);
      }

      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('Timeout: le média Instagram n\'est pas prêt');
  }

  async addComment(mediaId, text) {
    return this.apiRequest('POST', `/${mediaId}/comments`, {
      message: text,
    });
  }

  async getInsights(mediaId) {
    return this.apiRequest('GET', `/${mediaId}/insights`, {
      metric: 'impressions,reach,likes,comments,shares,saved',
    });
  }

  formatCaption(post) {
    let caption = post.caption || '';
    if (post.hashtags?.length) {
      caption += '\n\n' + post.hashtags.slice(0, 30).join(' ');
    }
    return caption.substring(0, 2200);
  }

  async apiRequest(method, endpoint, params = {}) {
    const url = `${BASE_URL}${endpoint}`;
    const data = { ...params, access_token: this.accessToken };

    const response = await axios({
      method,
      url,
      ...(method === 'GET' ? { params: data } : { data }),
    });

    return response.data;
  }
}
