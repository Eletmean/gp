import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { partnersAPI } from '../services/api';
import PartnerCard from '../components/partners/PartnerCard';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
// import { getAvatarUrl } from '../utils/avatar'; // если понадобится
import '../styles/Partners.css';

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

const Partners: React.FC = () => {
  const { user } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [gameFilter, setGameFilter] = useState('');

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    let filtered = partners;

    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(partner => 
        partner.username.toLowerCase().includes(query) ||
        partner.first_name.toLowerCase().includes(query) ||
        partner.last_name.toLowerCase().includes(query)
      );
    }

    if (gameFilter) {
      filtered = filtered.filter(partner => 
        partner.favorite_game === gameFilter
      );
    }

    setFilteredPartners(filtered);
  }, [searchQuery, gameFilter, partners]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Загрузка партнеров...');
      const response = await partnersAPI.getAll();
      console.log('Партнеры загружены:', response.data);
      setPartners(response.data);
      setFilteredPartners(response.data);
    } catch (err: any) {
      console.error('Ошибка загрузки партнеров:', err);
      setError('Не удалось загрузить партнеров. Попробуйте позже.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleGameFilter = (game: string) => {
    setGameFilter(game === gameFilter ? '' : game);
  };

  const handleSendFriendRequest = async (partnerId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Чтобы добавить в друзья, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.sendFriendRequest(partnerId);
      setPartners(prev => prev.map(p => 
        p.id === partnerId ? { ...p, friendship_status: 'pending' } : p
      ));
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.detail || 'Ошибка при отправке запроса');
    }
  };

  const handleRemoveFriend = async (partnerId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Чтобы удалить из друзей, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.removeFriend(partnerId);
      setPartners(prev => prev.map(p => 
        p.id === partnerId ? { ...p, is_friend: false, friendship_status: null } : p
      ));
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(err.response?.data?.detail || 'Ошибка при удалении из друзей');
    }
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

          {/* Поиск и фильтры */}
          <div className="partners-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск по имени, фамилии или username..."
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
                  onClick={() => setSearchQuery('')}
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
              <div className="no-partners-icon"></div>
              <h3>Партнеры не найдены</h3>
              {partners.length === 0 ? (
                <p>В базе данных пока нет партнеров</p>
              ) : (
                <p>Попробуйте изменить параметры поиска</p>
              )}
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setGameFilter('');
                }}
                className="btn btn-primary"
              >
                Сбросить фильтры
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