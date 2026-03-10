import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { partnersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../utils/avatar';
import '../styles/PartnerProfile.css';

interface Partner {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar: string;
  favorite_game: string | null;
  is_friend: boolean;
  friendship_status: 'pending' | 'accepted' | 'rejected' | null;
}

interface PartnerProfileData {
  user: Partner;
  friends_count: number;
  games_count: number;
  is_friend: boolean;
  friendship_status: string | null;
}

const PartnerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, logout } = useAuth();
  const [profile, setProfile] = useState<PartnerProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPartnerProfile();
  }, [id]);

  const loadPartnerProfile = async () => {
    try {
      setLoading(true);
      const response = await partnersAPI.getById(id!);
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error loading partner profile:', error);
      setError(error.response?.data?.detail || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async () => {
    try {
      await partnersAPI.sendFriendRequest(id!);
      loadPartnerProfile();
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  const handleRemoveFriend = async () => {
    try {
      await partnersAPI.removeFriend(id!);
      loadPartnerProfile();
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  if (loading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="loading">Загрузка профиля...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="error-message">{error || 'Профиль не найден'}</div>
        </main>
        <Footer />
      </div>
    );
  }

  const { user } = profile;

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="partner-profile-container">
          <div className="profile-header">
            <div className="profile-cover">
              <img 
                src={getAvatarUrl(user.avatar)} 
                alt={user.username} 
                className="profile-avatar-large"
                onError={handleImageError}
              />
            </div>
            
            <div className="profile-info">
              <h1 className="profile-name">
                {user.first_name} {user.last_name}
              </h1>
              <div className="profile-username">@{user.username}</div>
              
              <div className="profile-stats">
                <div className="stat-item">
                  <span className="stat-value">{profile.friends_count}</span>
                  <span className="stat-label">Друзей</span>
                </div>
                <div className="stat-item">
                  <span className="stat-value">{profile.games_count}</span>
                  <span className="stat-label">Игр</span>
                </div>
              </div>

              {!profile.is_friend && profile.friendship_status !== 'pending' && (
                <button 
                  className="btn btn-primary btn-large"
                  onClick={handleSendFriendRequest}
                >
                  Добавить в друзья
                </button>
              )}

              {profile.friendship_status === 'pending' && (
                <button className="btn btn-secondary btn-large" disabled>
                  Запрос отправлен
                </button>
              )}

              {profile.is_friend && (
                <button 
                  className="btn btn-danger btn-large"
                  onClick={handleRemoveFriend}
                >
                  Удалить из друзей
                </button>
              )}
            </div>
          </div>

          <div className="profile-content">
            <div className="profile-section">
              <h2>О себе</h2>
              <p>{user.bio || 'Пользователь не добавил информацию о себе'}</p>
            </div>

            {user.favorite_game && (
              <div className="profile-section">
                <h2>Любимая игра</h2>
                <div className="favorite-game-card">
                  <span>{user.favorite_game}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default PartnerProfile;