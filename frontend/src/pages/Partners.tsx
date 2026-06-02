import React, { useState, useEffect, useCallback } from 'react';
import { partnersAPI } from '../services/api';
import PartnerCard from '../components/partners/PartnerCard';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Partners.css';

// Убираем last_name из интерфейса Partner
interface Partner {
  id: string;
  username: string;
  first_name: string;
  bio: string;
  avatar: string;
  favorite_game: string | null;
  is_friend: boolean;
  friendship_status: 'pending' | 'accepted' | 'rejected' | null;
}

const Partners: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const loadPartners = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Загрузка партнеров...');
      const response = await partnersAPI.getAll();
      console.log('Партнеры загружены:', response.data);
      
      let partnersList = response.data;
      if (user && user.id) {
        const currentUserId = String(user.id);
        partnersList = partnersList.filter((partner: Partner) => partner.id !== currentUserId);
        console.log('Убран текущий пользователь из списка');
      }
      
      setPartners(partnersList);
      setFilteredPartners(partnersList);
    } catch (err: any) {
      console.error('Ошибка загрузки партнеров:', err);
      setError('Не удалось загрузить партнеров. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPartners();
  }, [loadPartners]);

  const applyFilters = useCallback((partnersList: Partner[], search: string) => {
    let filtered = [...partnersList];

    if (search.trim() !== '') {
      const query = search.toLowerCase();
      filtered = filtered.filter(partner => 
        partner.username.toLowerCase().includes(query) ||
        partner.first_name.toLowerCase().includes(query)
      );
    }

    setFilteredPartners(filtered);
  }, []);

  useEffect(() => {
    applyFilters(partners, searchQuery);
  }, [searchQuery, partners, applyFilters]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleSendFriendRequest = async (partnerId: string) => {
    if (!isAuthenticated) {
      alert('Чтобы добавить в друзья, нужно войти в систему');
      return;
    }

    if (user && String(user.id) === partnerId) {
      alert('Нельзя отправить запрос в друзья самому себе');
      return;
    }

    try {
      await partnersAPI.sendFriendRequest(partnerId);
      
      const updatedPartners = partners.map(p => 
        p.id === partnerId ? { ...p, friendship_status: 'pending' as const } : p
      );
      setPartners(updatedPartners);
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      if (err.response?.data?.detail === 'Запрос в друзья уже существует' || 
          err.response?.data?.detail === 'Запрос в друзья уже отправлен') {
        const updatedPartners = partners.map(p => 
          p.id === partnerId ? { ...p, friendship_status: 'pending' as const } : p
        );
        setPartners(updatedPartners);
      } else {
        alert(err.response?.data?.detail || 'Ошибка при отправке запроса');
      }
    }
  };

  const handleRemoveFriend = async (partnerId: string) => {
    if (!isAuthenticated) {
      alert('Чтобы удалить из друзей, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.removeFriend(partnerId);
      
      const updatedPartners = partners.map(p => 
        p.id === partnerId ? { ...p, is_friend: false, friendship_status: null } : p
      );
      setPartners(updatedPartners);
      
      alert('Пользователь удален из друзей');
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(err.response?.data?.detail || 'Ошибка при удалении из друзей');
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="partners-container">
          <div className="partners-header">
            <h1 className="partners-title">Партнеры</h1>
            <p className="partners-subtitle">
              Найди друзей для совместной игры
            </p>
          </div>

          <div className="partners-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск по имени или username..."
                value={searchQuery}
                onChange={handleSearch}
                className="partners-search"
              />
            </div>
            
            <div className="partners-stats">
              <span className="partners-count">
                Найдено партнеров: {filteredPartners.length}
              </span>
              {searchQuery && (
                <button 
                  onClick={clearSearch}
                  className="clear-search-btn"
                >
                  Очистить поиск
                </button>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Загрузка партнеров...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button onClick={loadPartners} className="retry-btn">
                Попробовать снова
              </button>
            </div>
          ) : filteredPartners.length === 0 ? (
            <div className="no-partners">
              <div className="no-partners-icon">👥</div>
              <h3>Партнеры не найдены</h3>
              {partners.length === 0 ? (
                <p>В базе данных пока нет партнеров</p>
              ) : (
                <p>Попробуйте изменить параметры поиска</p>
              )}
              <button 
                onClick={clearSearch}
                className="btn btn-primary"
              >
                Сбросить поиск
              </button>
            </div>
          ) : (
            <div className="partners-grid">
              {filteredPartners.map(partner => (
                <PartnerCard
                  key={partner.id}
                  partner={partner}
                  onSendRequest={handleSendFriendRequest}
                  onRemoveFriend={handleRemoveFriend}
                  isAuthenticated={isAuthenticated}
                  currentUserId={user?.id ? String(user.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Partners;