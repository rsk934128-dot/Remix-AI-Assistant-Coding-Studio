/**
 * YouTube API Service
 * Handles fetching authenticated user's YouTube Channel info, Playlists, and Playlist tracks.
 * Uses client-side OAuth Bearer token authenticated via Firebase GoogleAuthProvider with youtube.readonly scope.
 */
import { MusicTrack } from '../types';

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  description: string;
  customUrl?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  subscriberCount?: string;
  videoCount?: string;
  viewCount?: string;
}

export interface YouTubeUserPlaylist {
  id: string;
  title: string;
  description: string;
  itemCount: number;
  thumbnail: string;
  publishedAt?: string;
  channelTitle?: string;
}

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';

/**
 * Fetch authenticated user's YouTube channel profile
 */
export async function fetchMyYouTubeChannel(accessToken: string): Promise<YouTubeChannelInfo | null> {
  if (!accessToken) return null;

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}/channels?part=snippet,contentDetails,statistics&mine=true`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.warn('YouTube channel fetch failed:', res.status, errData);
      return null;
    }

    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      return null;
    }

    const item = data.items[0];
    const snippet = item.snippet || {};
    const stats = item.statistics || {};

    return {
      id: item.id,
      title: snippet.title || 'আমার ইউটিউব চ্যানেল',
      description: snippet.description || '',
      customUrl: snippet.customUrl,
      avatarUrl: snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
      subscriberCount: stats.subscriberCount ? Number(stats.subscriberCount).toLocaleString() : undefined,
      videoCount: stats.videoCount ? Number(stats.videoCount).toLocaleString() : undefined,
      viewCount: stats.viewCount ? Number(stats.viewCount).toLocaleString() : undefined,
    };
  } catch (err) {
    console.warn('Error fetching YouTube channel:', err);
    return null;
  }
}

/**
 * Fetch authenticated user's YouTube playlists
 */
export async function fetchMyYouTubePlaylists(accessToken: string): Promise<YouTubeUserPlaylist[]> {
  if (!accessToken) return [];

  try {
    const res = await fetch(`${YOUTUBE_API_BASE}/playlists?part=snippet,contentDetails&mine=true&maxResults=25`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      console.warn('YouTube playlists fetch failed:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      title: item.snippet?.title || 'প্লেলিস্ট',
      description: item.snippet?.description || '',
      itemCount: item.contentDetails?.itemCount || 0,
      thumbnail:
        item.snippet?.thumbnails?.medium?.url ||
        item.snippet?.thumbnails?.high?.url ||
        item.snippet?.thumbnails?.default?.url ||
        'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&auto=format&fit=crop',
      publishedAt: item.snippet?.publishedAt,
      channelTitle: item.snippet?.channelTitle,
    }));
  } catch (err) {
    console.warn('Error fetching YouTube playlists:', err);
    return [];
  }
}

/**
 * Fetch all items in a user's playlist and convert them into playable MusicTrack objects
 */
export async function fetchPlaylistItems(accessToken: string, playlistId: string): Promise<MusicTrack[]> {
  if (!accessToken || !playlistId) return [];

  try {
    const res = await fetch(
      `${YOUTUBE_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${playlistId}&maxResults=50`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      }
    );

    if (!res.ok) {
      console.warn('Playlist items fetch failed:', res.status);
      return [];
    }

    const data = await res.json();
    if (!data.items || !Array.isArray(data.items)) {
      return [];
    }

    const tracks: MusicTrack[] = [];
    for (const item of data.items) {
      const vid = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
      if (vid && /^[a-zA-Z0-9_-]{11}$/.test(vid)) {
        tracks.push({
          videoId: vid,
          title: item.snippet?.title || 'ইউটিউব ভিডিও',
          artist: item.snippet?.videoOwnerChannelTitle || item.snippet?.channelTitle || 'YouTube',
          thumbnail:
            item.snippet?.thumbnails?.medium?.url ||
            item.snippet?.thumbnails?.high?.url ||
            item.snippet?.thumbnails?.default?.url ||
            `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`,
          originalUrl: `https://www.youtube.com/watch?v=${vid}`,
          category: 'আমার প্লেলিস্ট',
        });
      }
    }
    return tracks;
  } catch (err) {
    console.warn('Error fetching playlist items:', err);
    return [];
  }
}
