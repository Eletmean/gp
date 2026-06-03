import axios from 'axios';

// ПРЯМАЯ ССЫЛКА НА БЭКЕНД
const API_URL = 'https://aggregation-games-backend.onrender.com/api/';

console.log('API URL:', API_URL);

// ===== ТИПЫ =====

export interface User {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name?: string;
  bio?: string;
  avatar?: string;
  favorite_game?: string;
  profile?: {
    created_at: string;
    updated_at: string;
  };
  friends_count?: number;
  followers_count?: number;
  following_count?: number;
  date_joined?: string;
  updated_at?: string;
}

export interface UserProfile extends User {
  avatar_url?: string;
}

export interface Game {
  id: number;
  name: string;
  image_url?: string;
}

export interface UserGame {
  id: number;
  game: Game;
  hours_played: number;
  created_at: string;
}

// Post types
export interface PostImage {
  id: number;
  image_url: string;
  created_at: string;
}

export interface PostAuthor {
  id: string;
  username: string;
  first_name: string;
  avatar?: string;
}

export interface Post {
  id: number;
  author_id: string;
  author: PostAuthor;
  content: string;
  privacy: 'public' | 'friends' | 'donators';
  images: PostImage[];
  comments: Comment[];
  likes: any[];
  comments_count: number;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at?: string;
}

export interface CommentAuthor {
  id: string;
  username: string;
  first_name: string;
  avatar?: string;
}

export interface Comment {
  id: number;
  post_id: number;
  author_id: string;
  author: CommentAuthor;
  parent_id?: number;
  replies?: Comment[];
  content: string;
  created_at: string;
  updated_at?: string;
}

export interface PostListResponse {
  posts: Post[];
  total: number;
  page: number;
  pages: number;
}

export interface Friend {
  id: string;
  username: string;
  first_name: string;
  avatar: string;
  is_friend?: boolean;
  friendship_status?: string | null;
}

export interface FriendRequest {
  id: number;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  updated_at?: string;
  user?: {
    id: string;
    username: string;
    first_name: string;
    bio?: string;
    avatar: string;
    favorite_game?: string | null;
    is_friend?: boolean;
    friendship_status?: string | null;
  };
}

export interface Partner {
  id: string;
  username: string;
  first_name: string;
  bio: string;
  avatar: string;
  favorite_game: string | null;
  is_friend: boolean;
  friendship_status: 'pending' | 'accepted' | 'rejected' | null;
}

export interface PartnerProfile {
  user: Partner;
  friends_count: number;
  games_count: number;
  is_friend: boolean;
  friendship_status: string | null;
}

// Donation types
export interface SubscriptionTier {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  icon: string;
  color: string;
  benefits: string[];
}

export interface DonatorStatus {
  is_donator: boolean;
  tier: string | null;
  expires_at: string | null;
}

export interface MySubscription {
  id: number;
  creator_id: string;
  creator_name: string;
  creator_avatar: string | null;
  tier: string | null;
  amount: number;
  expires_at: string | null;
}

export interface MyDonator {
  id: number;
  donator_id: string;
  donator_name: string;
  donator_avatar: string | null;
  tier: string | null;
  amount: number;
  created_at: string;
}

export interface GalleryImage {
  id: number;
  post_id: number;
  image_url: string;
  created_at: string;
}

export interface UserTier {
  id: number;
  user_id: string;
  tier_id: number;
  name: string;
  price: number;
  duration_days: number;
  icon: string;
  color: string;
  created_at: string;
  updated_at?: string;
}

// ===== НАСТРОЙКА AXIOS =====

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    console.log('Request URL:', config.baseURL, config.url);
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    const publicPaths = [
      '/games/',
      '/partners/',
      '/users/login',
      '/users/register',
      '/posts/'
    ];
    
    const isPublicPath = publicPaths.some(path => 
      originalRequest.url?.includes(path)
    );
    
    if (error.response?.status === 401 && !originalRequest._retry && !isPublicPath) {
      originalRequest._retry = true;
      clearAuthTokens();
      window.location.href = '/login';
    }
    
    console.error('API Error:', error.response?.status, error.response?.data);
    return Promise.reject(error);
  }
);

// ===== AUTH API =====
export const authAPI = {
  register: (data: {
    email: string;
    username: string;
    first_name: string;
    password: string;
  }) => api.post<User>('users/register', data),
  
  login: (data: { email: string; password: string }) => 
    api.post<{ access_token: string; token_type: string }>('users/login', data),
  
  getProfile: () => api.get<User>('users/me'),
  
  updateProfile: (data: FormData) => 
    api.put<User>('users/me', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  logout: () => api.post('users/logout'),
};

// ===== USERS API =====
export const usersAPI = {
  getUser: (userId: string) =>
    api.get<User>(`users/${userId}`),
  
  deleteProfile: () => 
    api.delete('users/me'),
};

// ===== PARTNERS API =====
export const partnersAPI = {
  getAll: (skip = 0, limit = 20, game?: string, search?: string) => 
    api.get<Partner[]>('partners/', { params: { skip, limit, game, search } }),
  
  search: (query: string) => 
    api.get<Partner[]>('partners/search', { params: { query } }),
  
  getById: (id: string) => 
    api.get<PartnerProfile>(`partners/${id}`),
  
  sendFriendRequest: (userId: string) => 
    api.post(`partners/${userId}/friend-request`),
  
  getFriendRequests: () => 
    api.get<FriendRequest[]>('partners/friend-requests'),
  
  acceptFriendRequest: (requestId: number) => 
    api.post(`partners/friend-requests/${requestId}/accept`),
  
  rejectFriendRequest: (requestId: number) => 
    api.post(`partners/friend-requests/${requestId}/reject`),
  
  respondToRequest: (userId: string, status: 'accepted' | 'rejected') => 
    api.put(`partners/${userId}/friend-request`, null, { params: { status } }),
  
  removeFriend: (userId: string) => 
    api.delete(`partners/${userId}/friend`),
  
  getUserFriends: (userId: string) => 
    api.get<Friend[]>(`partners/${userId}/friends`),
};

// ===== GAMES API =====
export const gamesAPI = {
  getAllGames: (params?: { search?: string; skip?: number; limit?: number }) =>
    api.get<Game[]>('games/', { params }),
  
  getGame: (gameId: number) =>
    api.get<Game>(`games/${gameId}`),
  
  createGame: (data: { name: string; image_url?: string }) =>
    api.post<Game>('games/', data),
  
  updateGame: (gameId: number, data: { name?: string; image_url?: string }) =>
    api.put<Game>(`games/${gameId}`, data),
  
  deleteGame: (gameId: number) =>
    api.delete(`games/${gameId}`),
  
  getUserGames: () => api.get<UserGame[]>('games/my-games/'),
  
  getUserGamesById: (userId: string) => 
    api.get<UserGame[]>(`games/user/${userId}/games`),
  
  addUserGame: (data: { game_id: number; hours_played?: number }) =>
    api.post<UserGame>('games/my-games/', data),
  
  updateUserGame: (userGameId: number, data: { hours_played?: number }) =>
    api.put<UserGame>(`games/my-games/${userGameId}`, data),
  
  removeUserGame: (userGameId: number) =>
    api.delete(`games/my-games/${userGameId}`),
};

// ===== POSTS API =====
export const postsAPI = {
  getPosts: (page = 1, perPage = 10) => 
    api.get<PostListResponse>('posts/', { params: { page, per_page: perPage } }),
  
  getUserPosts: (userId: string, page = 1, perPage = 10) => 
    api.get<PostListResponse>(`posts/user/${userId}`, { params: { page, per_page: perPage } }),
  
  getUserGallery: (userId: string) => 
    api.get<GalleryImage[]>(`posts/user/${userId}/gallery`),
  
  getPost: (postId: number) => 
    api.get<Post>(`posts/${postId}`),
  
  createPost: (formData: FormData) => 
    api.post<Post>('posts/', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  
  updatePost: (postId: number, data: { content?: string; privacy?: string }) => 
    api.put<Post>(`posts/${postId}`, data),
  
  deletePost: (postId: number) => 
    api.delete(`posts/${postId}`),
  
  likePost: (postId: number) => 
    api.post(`posts/${postId}/like`),
  
  unlikePost: (postId: number) => 
    api.delete(`posts/${postId}/like`),
  
  addComment: (postId: number, content: string, parentId?: number) => 
    api.post<Comment>(`posts/${postId}/comments`, { content }, { params: parentId ? { parent_id: parentId } : {} }),
  
  deleteComment: (commentId: number) => 
    api.delete(`posts/comments/${commentId}`),
};

// ===== DONATIONS API =====
export const donationsAPI = {
  getTiers: () => 
    api.get<SubscriptionTier[]>('donations/tiers'),
  
  getPublicTiers: () => 
    api.get<SubscriptionTier[]>('donations/tiers/public'),
  
  getCustomTiers: () => 
    api.get<UserTier[]>('donations/tiers/custom'),
  
  updateTier: (tierId: number, data: { name: string; price: number; duration_days: number }) =>
    api.put(`donations/tiers/${tierId}`, data),
  
  subscribe: (userId: string, tierId: number) => 
    api.post('donations/subscribe', { user_id: userId, tier_id: tierId }),
  
  oneTimeDonate: (userId: string, amount: number) => 
    api.post('donations/one-time', { user_id: userId, amount }),
  
  checkDonator: (userId: string) => 
    api.get<DonatorStatus>(`donations/check/${userId}`),
  
  getMySubscriptions: () => 
    api.get<MySubscription[]>('donations/my-subscriptions'),
  
  getMyDonators: () => 
    api.get<MyDonator[]>('donations/my-donators'),
  
  cancelSubscription: (userId: string) => 
    api.delete(`donations/subscription/${userId}`),
};

// ===== УТИЛИТЫ =====

export const setAuthToken = (token: string) => {
  localStorage.setItem('access_token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

export const clearAuthTokens = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
  delete api.defaults.headers.common['Authorization'];
};

export const isAuthenticated = (): boolean => {
  return !!localStorage.getItem('access_token');
};

export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

export const setCurrentUser = (user: User) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const login = async (email: string, password: string) => {
  const response = await authAPI.login({ email, password });
  setAuthToken(response.data.access_token);
  
  const userResponse = await authAPI.getProfile();
  setCurrentUser(userResponse.data);
  
  return userResponse.data;
};

export const register = async (data: {
  email: string;
  username: string;
  first_name: string;
  password: string;
}) => {
  await authAPI.register(data);
  return login(data.email, data.password);
};

export const logout = () => {
  authAPI.logout().catch(() => {});
  clearAuthTokens();
};

export const createProfileFormData = (data: {
  first_name?: string;
  last_name?: string;
  bio?: string;
  favorite_game?: string;
  avatar?: File;
}): FormData => {
  const formData = new FormData();
  
  if (data.first_name) formData.append('first_name', data.first_name);
  if (data.last_name) formData.append('last_name', data.last_name);
  if (data.bio) formData.append('bio', data.bio);
  if (data.favorite_game) formData.append('favorite_game', data.favorite_game);
  if (data.avatar) formData.append('avatar', data.avatar);
  
  return formData;
};

export default api;