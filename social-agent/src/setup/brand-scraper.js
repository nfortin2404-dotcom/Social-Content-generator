import axios from 'axios';
import * as cheerio from 'cheerio';
import chalk from 'chalk';

/**
 * Scrape un site web pour extraire les informations de marque
 */
export async function scrapeBrandInfo(url) {
  console.log(chalk.gray(`  Analyse de ${url}...`));

  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SocialAgent/1.0; brand-analysis)',
        'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
      },
      maxRedirects: 5,
    });

    const $ = cheerio.load(response.data);

    // Extraire les métadonnées essentielles
    const meta = {
      title: $('title').text().trim() ||
             $('meta[property="og:title"]').attr('content') || '',
      description:
        $('meta[name="description"]').attr('content') ||
        $('meta[property="og:description"]').attr('content') ||
        $('meta[name="twitter:description"]').attr('content') || '',
      siteName:
        $('meta[property="og:site_name"]').attr('content') ||
        $('meta[name="application-name"]').attr('content') || '',
      keywords:
        $('meta[name="keywords"]').attr('content') || '',
      ogImage:
        $('meta[property="og:image"]').attr('content') ||
        $('meta[name="twitter:image"]').attr('content') || '',
      logoUrl: findLogo($, url),
      themeColor:
        $('meta[name="theme-color"]').attr('content') || '',
      language:
        $('html').attr('lang') || 'fr',
    };

    // Extraire le contenu textuel principal
    const mainContent = extractMainContent($);

    // Extraire les liens sociaux existants
    const socialLinks = extractSocialLinks($, response.data);

    // Extraire la palette de couleurs (CSS variables communes)
    const colors = extractColors(response.data);

    return {
      url,
      ...meta,
      mainContent,
      socialLinks,
      colors,
      scrapedAt: new Date().toISOString(),
    };
  } catch (err) {
    console.log(chalk.yellow(`  ⚠ Impossible de scraper ${url}: ${err.message}`));
    return { url, error: err.message };
  }
}

function findLogo($, baseUrl) {
  const selectors = [
    'img[class*="logo"]',
    'img[id*="logo"]',
    'img[alt*="logo"]',
    'header img',
    'nav img',
    '.logo img',
    '#logo img',
    'a[href="/"] img',
  ];

  for (const sel of selectors) {
    const src = $(sel).first().attr('src');
    if (src) return resolveUrl(src, baseUrl);
  }

  const favicon =
    $('link[rel="apple-touch-icon"]').attr('href') ||
    $('link[rel="icon"][sizes="192x192"]').attr('href') ||
    $('link[rel="shortcut icon"]').attr('href') ||
    $('link[rel="icon"]').attr('href');

  return favicon ? resolveUrl(favicon, baseUrl) : '';
}

function extractMainContent($) {
  // Retirer les éléments non pertinents
  $('script, style, nav, footer, header, aside, [class*="cookie"], [class*="popup"]').remove();

  const sections = [];

  // H1 et H2 - titres principaux
  $('h1, h2').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 3 && text.length < 200) sections.push(text);
  });

  // Paragraphes significatifs
  $('p').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 50 && text.length < 500) sections.push(text);
  });

  return sections.slice(0, 15).join('\n');
}

function extractSocialLinks($, html) {
  const patterns = {
    instagram: /instagram\.com\/([^/"'\s?]+)/i,
    facebook: /facebook\.com\/([^/"'\s?]+)/i,
    tiktok: /tiktok\.com\/@([^/"'\s?]+)/i,
    twitter: /(?:twitter|x)\.com\/([^/"'\s?]+)/i,
    linkedin: /linkedin\.com\/(?:company|in)\/([^/"'\s?]+)/i,
    youtube: /youtube\.com\/(?:@|channel\/|c\/)([^/"'\s?]+)/i,
  };

  const found = {};
  for (const [platform, regex] of Object.entries(patterns)) {
    const match = html.match(regex);
    if (match) found[platform] = match[0];
  }
  return found;
}

function extractColors(html) {
  const colors = new Set();
  const hexPattern = /#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
  const matches = html.match(hexPattern) || [];

  // Garder seulement les couleurs qui apparaissent plusieurs fois (= couleurs de marque)
  const counts = {};
  for (const c of matches) {
    counts[c] = (counts[c] || 0) + 1;
  }

  Object.entries(counts)
    .filter(([, count]) => count >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .forEach(([color]) => colors.add(color));

  return [...colors];
}

function resolveUrl(src, base) {
  if (!src) return '';
  if (src.startsWith('http')) return src;
  if (src.startsWith('//')) return 'https:' + src;
  try {
    return new URL(src, base).href;
  } catch {
    return src;
  }
}
