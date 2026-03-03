import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/';

// ===== ТИПЫ =====

export interface User {
  id: string | number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
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

export interface Post {
  id: number;
  content: string;
  image?: string;
  author: User;
  created_at: string;
  updated_at: string;
  likes_count?: number;
  comments_count?: number;
  is_liked?: boolean;
  comments?: Comment[];
}

export interface Comment {
  id: number;
  content: string;
  author?: User;
  user?: User;
  created_at: string;
}

export interface Friend {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
  is_friend?: boolean;
  friendship_status?: string | null;
}

export interface FriendRequest {
  id: number;
  from_user: User;
  to_user: User;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface Partner {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
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

// ===== НАСТРОЙКА AXIOS =====

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
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
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      clearAuthTokens();
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// ===== AUTH API =====
export const authAPI = {
  register: (data: {
    email: string;
    username: string;
    first_name: string;
    last_name: string;
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
  getUser: (userId: string | number) =>
    api.get<User>(`users/${userId}`),
};

// ===== PARTNERS API =====
export const partnersAPI = {
  getAll: (skip = 0, limit = 20, game?: string) => 
    api.get<Partner[]>('partners/', { params: { skip, limit, game } }),
  
  search: (query: string) => 
    api.get<Partner[]>('partners/search', { params: { query } }),
  
  getById: (id: string) => 
    api.get<PartnerProfile>(`partners/${id}`),
  
  sendFriendRequest: (userId: string) => 
    api.post(`partners/${userId}/friend-request`),
  
  respondToRequest: (userId: string, status: 'accepted' | 'rejected') => 
    api.put(`partners/${userId}/friend-request`, null, { params: { status } }),
  
  removeFriend: (userId: string) => 
    api.delete(`partners/${userId}/friend`),
  
  // НОВЫЙ МЕТОД - получить друзей пользователя
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
  
  addUserGame: (data: { game_id: number; hours_played?: number }) =>
    api.post<UserGame>('games/my-games/', data),
  
  updateUserGame: (userGameId: number, data: { hours_played?: number }) =>
    api.put<UserGame>(`games/my-games/${userGameId}`, data),
  
  removeUserGame: (userGameId: number) =>
    api.delete(`games/my-games/${userGameId}`),
};

// ===== POSTS API =====
export const postsAPI = {
  getPosts: () => Promise.resolve({ data: { results: [], count: 0 } }),
  createPost: () => Promise.reject('Not implemented'),
  getPost: () => Promise.reject('Not implemented'),
  updatePost: () => Promise.reject('Not implemented'),
  deletePost: () => Promise.reject('Not implemented'),
  getUserPosts: () => Promise.reject('Not implemented'),
  likePost: () => Promise.reject('Not implemented'),
  createComment: () => Promise.reject('Not implemented'),
};

// ===== FRIENDS API =====
export const friendsAPI = {
  getFriends: () => Promise.resolve({ data: [] }),
  getFriendRequests: () => Promise.resolve({ data: [] }),
  sendFriendRequest: () => Promise.reject('Not implemented'),
  acceptFriendRequest: () => Promise.reject('Not implemented'),
  rejectFriendRequest: () => Promise.reject('Not implemented'),
  removeFriend: () => Promise.reject('Not implemented'),
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
  last_name: string;
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