export interface User {
  id: number;
  username: string;
  email?: string;
  avatar_url?: string;
  first_name?: string;
  last_name?: string;
}

export interface Game {
  id: number;
  name: string;
  icon_url?: string;
  color?: string;
  description?: string;
  image?: string;
}

export interface Profile {
  id: number;
  user: User;
  game?: Game;
  rating?: number;
  rank?: string;
  playtime?: number;
  followers_count?: number;
  created_at?: string;
}

export interface Filters {
  game: string;
  sortBy: string;
  search: string;
  rank: string;
}

export interface AuthContextType {
  user: User | null;
  login: (userData: User, token: string) => void;
  logout: () => void;
}