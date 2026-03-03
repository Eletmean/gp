import React, { createContext, useState, useContext, useEffect } from 'react';
import { User, getCurrentUser, logout as apiLogout } from '../services/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (userData: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем авторизацию при загрузке
    const loadUser = () => {
      const currentUser = getCurrentUser();
      console.log('AuthContext: загружен пользователь', currentUser);
      setUser(currentUser);
      setLoading(false);
    };
    
    loadUser();
    
    // Слушаем изменения localStorage (на случай входа в другой вкладке)
    const handleStorageChange = () => {
      const currentUser = getCurrentUser();
      console.log('AuthContext: storage изменился', currentUser);
      setUser(currentUser);
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const login = (userData: User) => {
    console.log('AuthContext: вход пользователя', userData);
    setUser(userData);
  };

  const logout = () => {
    console.log('AuthContext: выход пользователя');
    apiLogout();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated: !!user, 
      loading, 
      login, 
      logout, 
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};