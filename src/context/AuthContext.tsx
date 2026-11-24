import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, signInWithGoogle, signOutUser, db, AuthActionError } from '../lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { YouTubeUserProfile, YouTubePlaylistItem, MusicTrack } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  accessToken: string | null;
  authError: string | null;
  clearAuthError: () => void;
  isPopupBlocked: boolean;
  clearPopupBlocked: () => void;
  signIn: (withDrive?: boolean) => Promise<void>;
  signOut: () => Promise<void>;
  requestDriveToken: () => Promise<string | null>;
  isSyncing: boolean;
  setIsSyncing: (val: boolean) => void;
  // YouTube Auth & Personal Playlists Integration
  isYouTubeConnected: boolean;
  youtubeUser: YouTubeUserProfile | null;
  youtubePlaylists: YouTubePlaylistItem[];
  isFetchingPlaylists: boolean;
  signInWithYouTube: () => Promise<string | null>;
  connectPublicChannel: (identifier: string) => Promise<boolean>;
  fetchYouTubePlaylists: () => Promise<YouTubePlaylistItem[]>;
  fetchPlaylistTracks: (playlistId: string) => Promise<MusicTrack[]>;
  disconnectYouTube: () => void;
  // Gmail Direct Send & Compose OAuth Integration
  gmailAccessToken: string | null;
  isGmailConnected: boolean;
  signInWithGmail: () => Promise<string | null>;
  disconnectGmail: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  accessToken: null,
  authError: null,
  clearAuthError: () => {},
  isPopupBlocked: false,
  clearPopupBlocked: () => {},
  signIn: async () => {},
  signOut: async () => {},
  requestDriveToken: async () => null,
  isSyncing: false,
  setIsSyncing: () => {},
  isYouTubeConnected: false,
  youtubeUser: null,
  youtubePlaylists: [],
  isFetchingPlaylists: false,
  signInWithYouTube: async () => null,
  connectPublicChannel: async () => false,
  fetchYouTubePlaylists: async () => [],
  fetchPlaylistTracks: async () => [],
  disconnectYouTube: () => {},
  gmailAccessToken: null,
  isGmailConnected: false,
  signInWithGmail: async () => null,
  disconnectGmail: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [youtubeToken, setYoutubeToken] = useState<string | null>(null);
  const [gmailAccessToken, setGmailAccessToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isPopupBlocked, setIsPopupBlocked] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // YouTube OAuth state
  const [isYouTubeConnected, setIsYouTubeConnected] = useState<boolean>(false);
  const [youtubeUser, setYoutubeUser] = useState<YouTubeUserProfile | null>(null);
  const [youtubePlaylists, setYoutubePlaylists] = useState<YouTubePlaylistItem[]>([]);
  const [isFetchingPlaylists, setIsFetchingPlaylists] = useState<boolean>(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser) {
        setAccessToken(null);
        setYoutubeToken(null);
        setGmailAccessToken(null);
        setIsYouTubeConnected(false);
        setYoutubeUser(null);
        setYoutubePlaylists([]);
      } else {
        // Check if user has saved YouTube profile in Firestore
        try {
          const profileDoc = await getDoc(doc(db, 'users', currentUser.uid, 'settings', 'youtube_profile'));
          if (profileDoc.exists()) {
            const data = profileDoc.data();
            if (data?.channel) {
              setYoutubeUser(data.channel);
              setIsYouTubeConnected(true);
            }
          }
        } catch (_) {}
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async (withDrive = false) => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      const res = await signInWithGoogle(withDrive);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
      }
    } catch (error: any) {
      if (error?.isUserCancelled || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        console.info('User cancelled login popup.');
        setAuthError(null);
        return;
      }
      if (error?.isPopupBlocked || error?.code === 'auth/popup-blocked') {
        console.warn('Login popup was blocked by browser.');
        setIsPopupBlocked(true);
        setAuthError('ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে ব্রাউজার অ্যাড্রেসবারে পপ-আপ অনুমোদন করে পুনরায় চেষ্টা করুন।');
        return;
      }
      console.warn('Login notice:', error?.message || error);
      setAuthError(error?.message || 'লগইন সম্পন্ন করা যায়নি');
    }
  };

  const handleRequestDriveToken = async (): Promise<string | null> => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      const res = await signInWithGoogle(true);
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        return res.accessToken;
      }
      return null;
    } catch (error: any) {
      if (error?.isUserCancelled || error?.code === 'auth/popup-closed-by-user') {
        console.info('User cancelled Google Drive consent popup.');
        return null;
      }
      if (error?.isPopupBlocked || error?.code === 'auth/popup-blocked') {
        console.warn('Drive popup was blocked by browser.');
        setIsPopupBlocked(true);
        setAuthError('ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে ব্রাউজার অ্যাড্রেসবারে পপ-আপ অনুমোদন করে পুনরায় চেষ্টা করুন।');
        return null;
      }
      console.warn('Drive token request issue:', error?.message || error);
      setAuthError(error?.message || 'Drive সংযোগ ব্যর্থ হয়েছে');
      return null;
    }
  };

  /**
   * YouTube OAuth Login & Channel Profile Fetching
   */
  const handleSignInWithYouTube = async (): Promise<string | null> => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      const res = await signInWithGoogle('youtube');
      const token = res?.accessToken;
      if (!token) {
        return null;
      }

      setYoutubeToken(token);
      setAccessToken(token);

      // Fetch Channel Profile
      try {
        const resp = await fetch('/api/youtube/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.channel) {
            setYoutubeUser(data.channel);
            setIsYouTubeConnected(true);

            // Sync to Firestore if user logged in
            if (res.user?.uid) {
              try {
                await setDoc(doc(db, 'users', res.user.uid, 'settings', 'youtube_profile'), {
                  channel: data.channel,
                  connectedAt: Date.now(),
                }, { merge: true });
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        console.warn('Could not fetch YouTube channel info:', err);
      }

      // Also automatically fetch playlists
      fetchPlaylistsWithToken(token);

      setIsYouTubeConnected(true);
      return token;
    } catch (error: any) {
      if (error?.isUserCancelled || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        console.info('User closed YouTube login popup.');
        setAuthError(null);
        return null;
      }
      if (error?.isPopupBlocked || error?.code === 'auth/popup-blocked') {
        console.warn('YouTube login popup was blocked by browser.');
        setIsPopupBlocked(true);
        setAuthError('ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে অ্যাড্রেসবারে পপ-আপ অনুমোদন করে পুনরায় চেষ্টা করুন।');
        return null;
      }
      console.warn('YouTube login issue:', error?.message || error);
      setAuthError(error?.message || 'ইউটিউব সংযোগ স্থাপন করা যায়নি');
      return null;
    }
  };

  /**
   * Connect public YouTube Channel without requiring popups (via Handle, Channel ID, or Name)
   */
  const handleConnectPublicChannel = async (identifier: string): Promise<boolean> => {
    if (!identifier.trim()) return false;
    setIsFetchingPlaylists(true);
    setAuthError(null);
    try {
      const resp = await fetch(`/api/youtube/public-channel?query=${encodeURIComponent(identifier.trim())}`);
      if (resp.ok) {
        const data = await resp.json();
        if (data.channel) {
          setYoutubeUser(data.channel);
          setIsYouTubeConnected(true);
          if (Array.isArray(data.playlists)) {
            setYoutubePlaylists(data.playlists);
          }
          return true;
        }
      }
      setAuthError('চ্যানেলটি খুঁজে পাওয়া যায়নি। সঠিক হ্যান্ডেল বা নাম লিখুন।');
      return false;
    } catch (err: any) {
      console.warn('Failed to load public channel:', err);
      setAuthError('চ্যানেল লোড করা যায়নি।');
      return false;
    } finally {
      setIsFetchingPlaylists(false);
    }
  };

  const fetchPlaylistsWithToken = async (token: string): Promise<YouTubePlaylistItem[]> => {
    setIsFetchingPlaylists(true);
    try {
      const resp = await fetch('/api/youtube/user/playlists', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.playlists)) {
          setYoutubePlaylists(data.playlists);
          return data.playlists;
        }
      }
      return [];
    } catch (e) {
      console.warn('Error fetching playlists:', e);
      return [];
    } finally {
      setIsFetchingPlaylists(false);
    }
  };

  const handleFetchYouTubePlaylists = async (): Promise<YouTubePlaylistItem[]> => {
    if (!youtubeToken) {
      // Re-trigger sign in if no token available
      const token = await handleSignInWithYouTube();
      if (!token) return youtubePlaylists;
      return fetchPlaylistsWithToken(token);
    }
    return fetchPlaylistsWithToken(youtubeToken);
  };

  const handleFetchPlaylistTracks = async (playlistId: string): Promise<MusicTrack[]> => {
    if (!youtubeToken) {
      return fetchPlaylistTracksWithToken(playlistId, '');
    }
    return fetchPlaylistTracksWithToken(playlistId, youtubeToken);
  };

  const fetchPlaylistTracksWithToken = async (playlistId: string, token: string): Promise<MusicTrack[]> => {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const resp = await fetch(`/api/youtube/user/playlist-items?playlistId=${encodeURIComponent(playlistId)}`, {
        headers,
      });
      if (resp.ok) {
        const data = await resp.json();
        if (Array.isArray(data.tracks)) {
          return data.tracks;
        }
      }
      return [];
    } catch (e) {
      console.warn('Error fetching playlist tracks:', e);
      return [];
    }
  };

  const handleDisconnectYouTube = () => {
    setYoutubeToken(null);
    setIsYouTubeConnected(false);
    setYoutubeUser(null);
    setYoutubePlaylists([]);
    setAuthError(null);
    setIsPopupBlocked(false);
  };

  /**
   * Gmail OAuth Login (In-memory access token ONLY)
   */
  const handleSignInWithGmail = async (): Promise<string | null> => {
    try {
      setAuthError(null);
      setIsPopupBlocked(false);
      const res = await signInWithGoogle('gmail');
      const token = res?.accessToken || null;
      if (token) {
        setGmailAccessToken(token);
      }
      return token;
    } catch (error: any) {
      if (error?.isUserCancelled || error?.code === 'auth/popup-closed-by-user' || error?.code === 'auth/cancelled-popup-request') {
        console.info('User closed Gmail login popup.');
        setAuthError(null);
        return null;
      }
      if (error?.isPopupBlocked || error?.code === 'auth/popup-blocked') {
        console.warn('Gmail login popup was blocked by browser.');
        setIsPopupBlocked(true);
        setAuthError('ব্রাউজার পপ-আপ উইন্ডোটি ব্লক করেছে। অনুগ্রহ করে অ্যাড্রেসবারে পপ-আপ অনুমোদন করে পুনরায় চেষ্টা করুন।');
        return null;
      }
      console.warn('Gmail login issue:', error?.message || error);
      setAuthError(error?.message || 'Gmail সংযোগ স্থাপন করা যায়নি');
      return null;
    }
  };

  const handleDisconnectGmail = () => {
    setGmailAccessToken(null);
    setAuthError(null);
    setIsPopupBlocked(false);
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setAccessToken(null);
      setYoutubeToken(null);
      setGmailAccessToken(null);
      setIsYouTubeConnected(false);
      setYoutubeUser(null);
      setYoutubePlaylists([]);
      setAuthError(null);
      setIsPopupBlocked(false);
    } catch (error) {
      console.warn('Logout notice:', error);
    }
  };

  const clearAuthError = useCallback(() => {
    setAuthError(null);
    setIsPopupBlocked(false);
  }, []);

  const clearPopupBlocked = useCallback(() => {
    setIsPopupBlocked(false);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        accessToken,
        authError,
        clearAuthError,
        isPopupBlocked,
        clearPopupBlocked,
        signIn: handleSignIn,
        signOut: handleSignOut,
        requestDriveToken: handleRequestDriveToken,
        isSyncing,
        setIsSyncing,
        isYouTubeConnected,
        youtubeUser,
        youtubePlaylists,
        isFetchingPlaylists,
        signInWithYouTube: handleSignInWithYouTube,
        connectPublicChannel: handleConnectPublicChannel,
        fetchYouTubePlaylists: handleFetchYouTubePlaylists,
        fetchPlaylistTracks: handleFetchPlaylistTracks,
        disconnectYouTube: handleDisconnectYouTube,
        gmailAccessToken,
        isGmailConnected: Boolean(gmailAccessToken && user),
        signInWithGmail: handleSignInWithGmail,
        disconnectGmail: handleDisconnectGmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
