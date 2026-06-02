import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../../utils/avatar';
import '../../styles/Header.css';

const Header: React.FC = () => {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="header">
      <div className="header-container">
        <div className="header-left">
          <Link to="/" className="logo">
            <span className="logo-accent">AG</span>
            <span className="logo-text">Aggregation Games</span>
          </Link>
          
          <nav className="nav">
            <Link to="/news" className="nav-link">Новости</Link>
            <Link to="/games" className="nav-link">Игры</Link>
            <Link to="/partners" className="nav-link">Партнеры</Link>
            <Link to="/shop" className="nav-link">Магазин</Link>
            <Link to="/about" className="nav-link">О нас</Link>
            <Link to="/merch" className="nav-link">Мерч</Link>
          </nav>
        </div>

        <div className="header-actions">
          {isAuthenticated ? (
            <div className="user-menu">
              <Link to="/profile" className="user-info">
                <img 
                  src={getAvatarUrl(user?.avatar)} 
                  alt={user?.username} 
                  className="avatar"
                  onError={handleImageError}
                />
                <span>{user?.username}</span>
              </Link>
              {/* Кнопка "Выйти" удалена из хедера - теперь только в профиле */}
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn btn-secondary">Войти</Link>
              <Link to="/register" className="btn btn-primary">Регистрация</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;