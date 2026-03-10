import axios from 'axios';

const BASE_URL = 'https://graph.facebook.com/v21.0';

/**
 * Publie du contenu sur une Page Facebook via Meta Graph API
 */
export class FacebookPublisher {
  constructor() {
    this.accessToken = process.env.META_ACCESS_TOKEN;
    this.pageId = process.env.FACEBOOK_PAGE_ID;

    if (!this.accessToken || !this.pageId) {
      throw new Error('META_ACCESS_TOKEN et FACEBOOK_PAGE_ID requis dans .env');
    }
  }

  /**
   * Publie selon le format
   */
  async publish(post) {
    switch (post.format) {
      case 'text':
        return this.publishText(post);
      case 'image':
        return this.publishImage(post);
      case 'carousel':
        return this.publishCarousel(post);
      case 'video':
      case 'reel':
        return this.publishVideo(post);
      case 'link':
        return this.publishLink(post);
      default:
        return this.publishText(post);
    }
  }

  /**
   * Post texte uniquement
   */
  async publishText(post) {
    return this.apiRequest('POST', `/${this.pageId}/feed`, {
      message: post.caption || '',
    });
  }

  /**
   * Post avec une image
   */
  async publishImage(post) {
    if (!post.imageUrl && !post.imageLocalPath) {
      // Fallback: post texte si pas d'image
      return this.publishText(post);
    }

    if (post.imageUrl) {
      // Publier via URL
      return this.apiRequest('POST', `/${this.pageId}/photos`, {
        url: post.imageUrl,
        caption: this.formatCaption(post),
        published: true,
      });
    }

    // Depuis un fichier local (multipart)
    const FormData = (await import('form-data')).default;
    const fs = (await import('fs')).default;
    const form = new FormData();
    form.append('source', fs.createReadStream(post.imageLocalPath));
    form.append('caption', this.formatCaption(post));
    form.append('access_token', this.accessToken);
    form.append('published', 'true');

    const response = await axios.post(`${BASE_URL}/${this.pageId}/photos`, form, {
      headers: form.getHeaders(),
    });
    return response.data;
  }

  /**
   * Carrousel multi-images (album Facebook)
   */
  async publishCarousel(post) {
    const images = post.carouselImages || [];

    if (!images.length) {
      return this.publishText(post);
    }

    // Uploader chaque image sans la publier
    const photoIds = [];
    for (const imgUrl of images) {
      const photo = await this.apiRequest('POST', `/${this.pageId}/photos`, {
        url: imgUrl,
        published: false,
      });
      photoIds.push({ media_fbid: photo.id });
    }

    // Créer un post avec toutes les photos
    return this.apiRequest('POST', `/${this.pageId}/feed`, {
      message: this.formatCaption(post),
      attached_media: JSON.stringify(photoIds),
    });
  }

  /**
   * Vidéo
   */
  async publishVideo(post) {
    if (!post.videoUrl) {
      return this.publishText(post);
    }

    return this.apiRequest('POST', `/${this.pageId}/videos`, {
      file_url: post.videoUrl,
      description: this.formatCaption(post),
      title: post.videoTitle || post.caption?.substring(0, 100) || '',
    });
  }

  /**
   * Post avec lien (link preview automatique)
   */
  async publishLink(post) {
    return this.apiRequest('POST', `/${this.pageId}/feed`, {
      message: post.caption || '',
      link: post.linkUrl || '',
    });
  }

  /**
   * Planifier un post pour publication future
   */
  async schedulePost(post, scheduledTimestamp) {
    const params = await this.buildPostParams(post);
    return this.apiRequest('POST', `/${this.pageId}/feed`, {
      ...params,
      published: false,
      scheduled_publish_time: scheduledTimestamp,
    });
  }

  async getPageInsights(metric = 'page_impressions,page_reach,page_fans') {
    return this.apiRequest('GET', `/${this.pageId}/insights`, {
      metric,
      period: 'day',
    });
  }

  async getPostInsights(postId) {
    return this.apiRequest('GET', `/${postId}/insights`, {
      metric: 'post_impressions,post_reach,post_reactions_by_type_total,post_clicks',
    });
  }

  formatCaption(post) {
    let caption = post.caption || '';
    if (post.hashtags?.length) {
      caption += '\n\n' + post.hashtags.slice(0, 10).join(' ');
    }
    return caption;
  }

  async buildPostParams(post) {
    return { message: this.formatCaption(post) };
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
