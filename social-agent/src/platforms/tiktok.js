import axios from 'axios';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://open.tiktokapis.com/v2';

/**
 * Publie du contenu sur TikTok via TikTok Content Posting API
 * Nécessite une approbation TikTok Developer
 */
export class TikTokPublisher {
  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN;
    this.openId = process.env.TIKTOK_OPEN_ID;

    if (!this.accessToken || !this.openId) {
      throw new Error('TIKTOK_ACCESS_TOKEN et TIKTOK_OPEN_ID requis dans .env');
    }
  }

  /**
   * Publie selon le format
   */
  async publish(post) {
    switch (post.format) {
      case 'short-video':
      case 'video':
        return this.publishVideo(post);
      case 'image':
        return this.publishPhotoPost(post);
      default:
        return this.publishVideo(post);
    }
  }

  /**
   * Publication vidéo TikTok
   * L'API TikTok nécessite une URL publique ou upload direct
   */
  async publishVideo(post) {
    if (!post.videoUrl && !post.videoLocalPath) {
      throw new Error('Vidéo requise pour TikTok');
    }

    const caption = this.formatCaption(post);

    if (post.videoUrl) {
      // Publication depuis URL publique
      return this.publishFromUrl(post.videoUrl, caption, post);
    } else {
      // Publication depuis fichier local (upload en 2 étapes)
      return this.publishFromFile(post.videoLocalPath, caption, post);
    }
  }

  /**
   * Publication photo (Post Photos - disponible dans certaines régions)
   */
  async publishPhotoPost(post) {
    if (!post.imageUrl) {
      throw new Error('Image requise pour un post photo TikTok');
    }

    const response = await this.apiRequest('POST', '/post/publish/content/init/', {
      post_info: {
        title: this.formatCaption(post).substring(0, 150),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        photo_images: [post.imageUrl],
        photo_cover_index: 0,
      },
      post_mode: 'DIRECT_POST',
      media_type: 'PHOTO',
    });

    return response;
  }

  async publishFromUrl(videoUrl, caption, post) {
    const response = await this.apiRequest('POST', '/post/publish/video/init/', {
      post_info: {
        title: caption.substring(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
        video_cover_timestamp_ms: 1000,
      },
      source_info: {
        source: 'PULL_FROM_URL',
        video_url: videoUrl,
      },
    });

    return this.pollPublishStatus(response.data?.publish_id);
  }

  async publishFromFile(filePath, caption, post) {
    const fileSize = fs.statSync(filePath).size;

    // Étape 1: Initialiser l'upload
    const initResponse = await this.apiRequest('POST', '/post/publish/video/init/', {
      post_info: {
        title: caption.substring(0, 2200),
        privacy_level: 'PUBLIC_TO_EVERYONE',
        disable_duet: false,
        disable_comment: false,
        disable_stitch: false,
      },
      source_info: {
        source: 'FILE_UPLOAD',
        video_size: fileSize,
        chunk_size: fileSize,
        total_chunk_count: 1,
      },
    });

    const { publish_id, upload_url } = initResponse.data;

    // Étape 2: Upload du fichier
    const fileBuffer = fs.readFileSync(filePath);
    await axios.put(upload_url, fileBuffer, {
      headers: {
        'Content-Type': 'video/mp4',
        'Content-Range': `bytes 0-${fileSize - 1}/${fileSize}`,
        'Content-Length': fileSize,
      },
    });

    // Étape 3: Vérifier le statut
    return this.pollPublishStatus(publish_id);
  }

  async pollPublishStatus(publishId, maxAttempts = 15) {
    if (!publishId) return { publish_id: publishId };

    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.apiRequest('POST', '/post/publish/status/fetch/', {
        publish_id: publishId,
      });

      const state = status.data?.status;

      if (state === 'PUBLISH_COMPLETE') {
        return status.data;
      }
      if (state === 'FAILED') {
        throw new Error(`Publication TikTok échouée: ${JSON.stringify(status.data)}`);
      }

      await new Promise((r) => setTimeout(r, 4000));
    }

    throw new Error('Timeout: la publication TikTok n\'a pas abouti');
  }

  async getVideoInfo(videoId) {
    return this.apiRequest('POST', '/video/query/', {
      filters: { video_ids: [videoId] },
      fields: ['id', 'title', 'video_description', 'duration', 'cover_image_url', 'share_url',
               'view_count', 'like_count', 'comment_count', 'share_count'],
    });
  }

  async getUserInfo() {
    return this.apiRequest('GET', '/user/info/', {}, {
      params: { fields: 'open_id,union_id,avatar_url,display_name,username,follower_count,following_count,video_count' },
    });
  }

  formatCaption(post) {
    let caption = post.caption || '';
    if (post.hashtags?.length) {
      const tags = post.hashtags.slice(0, 10).join(' ');
      if (caption.length + tags.length + 2 <= 2200) {
        caption += ' ' + tags;
      }
    }
    return caption.substring(0, 2200);
  }

  async apiRequest(method, endpoint, data = {}, config = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const response = await axios({
      method,
      url,
      data: method !== 'GET' ? data : undefined,
      params: method === 'GET' ? data : undefined,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json; charset=UTF-8',
      },
      ...config,
    });

    if (response.data?.error?.code !== 'ok' && response.data?.error?.code !== undefined) {
      throw new Error(`TikTok API Error: ${JSON.stringify(response.data.error)}`);
    }

    return response.data;
  }
}
