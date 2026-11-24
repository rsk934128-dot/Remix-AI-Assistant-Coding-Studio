/**
 * Universal Media Utilities
 * Robust detection and formatting for any Video or Image URL:
 * - Direct video files: MP4, WebM, OGG, MOV, MKV, M4V
 * - Video platforms: YouTube, Vimeo, Dailymotion, Google Drive
 * - Direct image files: JPG, JPEG, PNG, GIF, WEBP, SVG, AVIF, BMP, ICO
 * - Image CDN domains: Unsplash, Imgur, Cloudinary, Pixabay, Pexels, GitHub assets
 */

export type MediaType = 'youtube' | 'vimeo' | 'dailymotion' | 'drive_video' | 'direct_video' | 'image' | 'audio' | 'unknown';

export interface MediaInfo {
  type: MediaType;
  url: string;
  id?: string;
  title?: string;
}

// Check if a URL points to a direct video file
export function isDirectVideoUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  const videoExts = ['.mp4', '.webm', '.ogg', '.ogv', '.mov', '.mkv', '.m4v', '.3gp'];
  if (videoExts.some(ext => cleanUrl.endsWith(ext))) return true;

  // Query parameter or path checks
  if (url.includes('format=mp4') || url.includes('type=video') || url.includes('.mp4?')) return true;
  return false;
}

// Check if a URL points to a direct image file or known image host
export function isImageUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  if (url.startsWith('data:image/')) return true;
  if (url.startsWith('blob:') && (url.includes('image') || url.includes('img'))) return true;

  const cleanUrl = url.split('?')[0].toLowerCase();
  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico'];
  if (imageExts.some(ext => cleanUrl.endsWith(ext))) return true;

  // Known CDN domains with image paths
  if (
    url.includes('images.unsplash.com/') ||
    url.includes('i.imgur.com/') ||
    url.includes('res.cloudinary.com/') ||
    url.includes('cdn.pixabay.com/') ||
    url.includes('images.pexels.com/') ||
    url.includes('i.ibb.co/') ||
    url.includes('gyazo.com/') ||
    url.includes('avatars.githubusercontent.com/') ||
    url.includes('picsum.photos/')
  ) {
    return true;
  }

  return false;
}

// Check if a URL is an audio file
export function isDirectAudioUrl(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  const audioExts = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  return audioExts.some(ext => cleanUrl.endsWith(ext));
}

// Extract YouTube ID
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:(?:youtube|music\.youtube)\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i
  );
  return match ? match[1] : null;
}

// Extract Vimeo ID
export function extractVimeoId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|video\/|)(\d+)|player\.vimeo\.com\/video\/(\d+))/i);
  return match ? (match[3] || match[4] || match[5] || match[2] || null) : null;
}

// Extract Dailymotion ID
export function extractDailymotionId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:dailymotion\.com\/(?:video|hub)\/([^_]+)|dai\.ly\/([a-zA-Z0-9]+))/i);
  return match ? (match[1] || match[2] || null) : null;
}

// Extract Google Drive Video Preview ID
export function extractDriveVideoId(url: string): string | null {
  if (!url || !url.includes('drive.google.com')) return null;
  const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/i);
  return match ? match[1] : null;
}

// Universal media inspector for any URL
export function inspectMediaUrl(url: string): MediaInfo {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) return { type: 'unknown', url: cleanUrl };

  const ytId = extractYouTubeId(cleanUrl);
  if (ytId) {
    return { type: 'youtube', url: cleanUrl, id: ytId, title: 'YouTube ভিডিও' };
  }

  const vimeoId = extractVimeoId(cleanUrl);
  if (vimeoId) {
    return { type: 'vimeo', url: cleanUrl, id: vimeoId, title: 'Vimeo ভিডিও' };
  }

  const dmId = extractDailymotionId(cleanUrl);
  if (dmId) {
    return { type: 'dailymotion', url: cleanUrl, id: dmId, title: 'Dailymotion ভিডিও' };
  }

  const driveId = extractDriveVideoId(cleanUrl);
  if (driveId) {
    return { type: 'drive_video', url: cleanUrl, id: driveId, title: 'Google Drive ভিডিও' };
  }

  if (isDirectVideoUrl(cleanUrl)) {
    return { type: 'direct_video', url: cleanUrl, title: 'ভিডিও ফাইল (Direct Video)' };
  }

  if (isImageUrl(cleanUrl)) {
    return { type: 'image', url: cleanUrl, title: 'ইমেজ / ছবি' };
  }

  if (isDirectAudioUrl(cleanUrl)) {
    return { type: 'audio', url: cleanUrl, title: 'অডিও ফাইল' };
  }

  return { type: 'unknown', url: cleanUrl };
}

/**
 * Auto-format bare URLs in text so markdown parses them into rich media players & image cards.
 * Avoids touching URLs already enclosed in markdown brackets [title](url) or ![alt](url).
 */
export function autoFormatMediaLinks(rawText: string): string {
  if (!rawText) return '';

  let formatted = rawText;

  // 1. Format YouTube URLs
  formatted = formatted.replace(
    /(?<!\]\(|href=["']|src=["'])(https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com\/(?:watch\?(?:[^\s)]*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}[^\s<>"')]*)/gi,
    (match) => `[ইউটিউব ভিডিও](${match})`
  );

  // 2. Format Vimeo URLs
  formatted = formatted.replace(
    /(?<!\]\(|href=["']|src=["'])(https?:\/\/(?:www\.)?(?:vimeo\.com\/\d+|player\.vimeo\.com\/video\/\d+)[^\s<>"')]*)/gi,
    (match) => `[ভিমিও ভিডিও](${match})`
  );

  // 3. Format Direct Video URLs (.mp4, .webm, .ogg, .mov, etc.)
  formatted = formatted.replace(
    /(?<!\]\(|href=["']|src=["'])(https?:\/\/[^\s<>"')]+?\.(?:mp4|webm|ogg|mov|mkv|m4v)(?:\?[^\s<>"')]*)?)/gi,
    (match) => `[ভিডিও প্লেয়ার](${match})`
  );

  // 4. Format Direct Image URLs (.jpg, .jpeg, .png, .gif, .webp, .svg, etc. or unsplash)
  formatted = formatted.replace(
    /(?<!\!\[[^\]]*\]\(|\]\(|href=["']|src=["'])(https?:\/\/[^\s<>"')]+?\.(?:jpg|jpeg|png|gif|webp|svg|avif)(?:\?[^\s<>"')]*)?)/gi,
    (match) => `![ছবি](${match})`
  );

  return formatted;
}
