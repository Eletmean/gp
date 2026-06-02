import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import GamesCarousel from '../components/common/GamesCarousel';
import PartnerCard from '../components/partners/PartnerCard';
import { partnersAPI, gamesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Home.css';

interface Game {
  id: number;
  name: string;
  image_url?: string;
  color?: string;
}

// Убрали last_name
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

interface Filters {
  game: string;
  search: string;
}

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const [profiles, setProfiles] = useState<Partner[]>([]);
  const [allProfiles, setAllProfiles] = useState<Partner[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    game: '',
    search: ''
  });

  useEffect(() => {
    loadGames();
    loadProfiles();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [allProfiles, filters]);

  const loadGames = async () => {
    try {
      const response = await gamesAPI.getAllGames();
      const gamesWithColors = response.data.map((game, index) => ({
        ...game,
        color: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FF4757', '#FFA502'][index % 6]
      }));
      setGames(gamesWithColors);
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const loadProfiles = async () => {
    try {
      setLoading(true);
      const response = await partnersAPI.getAll();
      console.log('Загруженные партнеры:', response.data);
      
      let partnersList = response.data;
      // Исключаем текущего пользователя
      if (user && user.id) {
        partnersList = partnersList.filter((partner: Partner) => partner.id !== String(user.id));
      }
      
      setAllProfiles(partnersList);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...allProfiles];

    if (filters.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(profile => 
        profile.username.toLowerCase().includes(query) ||
        profile.first_name.toLowerCase().includes(query)
      );
    }

    if (filters.game) {
      filtered = filtered.filter(profile => 
        profile.favorite_game === games.find(g => g.id === parseInt(filters.game))?.name
      );
    }

    setProfiles(filtered);
  };

  const handleFilterChange = (key: keyof Filters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFilterChange('search', e.target.value);
  };

  const clearAllFilters = () => {
    setFilters({
      game: '',
      search: ''
    });
  };

  const hasActiveFilters = filters.search || filters.game;

  const handleSendFriendRequest = async (partnerId: string) => {
    if (!isAuthenticated) {
      alert('Чтобы добавить в друзья, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.sendFriendRequest(partnerId);
      setAllProfiles(prev => prev.map(p => 
        p.id === partnerId ? { ...p, friendship_status: 'pending' } : p
      ));
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.detail || 'Ошибка при отправке запроса');
    }
  };

  const handleRemoveFriend = async (partnerId: string) => {
    if (!isAuthenticated) {
      alert('Чтобы удалить из друзей, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.removeFriend(partnerId);
      setAllProfiles(prev => prev.map(p => 
        p.id === partnerId ? { ...p, is_friend: false, friendship_status: null } : p
      ));
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(err.response?.data?.detail || 'Ошибка при удалении из друзей');
    }
  };

  const handleVideoButtonClick = () => {
    console.log('Кнопка видео нажата');
    alert('Функция открытия видео будет добавлена позже');
  };

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="content-container">
          <section className="main-banner">
            <div className="banner-content">
              <h1 className="banner-title">
                Найди идеального <span className="accent">игрового партнёра</span>
              </h1>
              <p className="banner-subtitle">
                Присоединяйся к сообществу геймеров, находи единомышленников и монетизируй свой игровой опыт
              </p>
            </div>
          </section>

          <section className="ad-banners-row">
            <div className="ad-banner large">
              <div className="ad-placeholder">
                <span>Рекламный баннер</span>
                <p>Большой баннер</p>
              </div>
            </div>
            <div className="ad-banner small">
              <div className="ad-placeholder">
                <span>Рекламный баннер</span>
                <p>Малый баннер 1</p>
              </div>
            </div>
            <div className="ad-banner small">
              <div className="ad-placeholder">
                <span>Рекламный баннер</span>
                <p>Малый баннер 2</p>
              </div>
            </div>
          </section>

          <GamesCarousel />

          <section className="filters-section">
            <div className="filters-row">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Поиск по нику, имени..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="search-input"
                />
              </div>
              
              <div className="game-filter">
                <select 
                  value={filters.game}
                  onChange={(e) => handleFilterChange('game', e.target.value)}
                  className="game-select"
                >
                  <option value="">Все игры</option>
                  {games.map(game => (
                    <option key={game.id} value={game.id}>
                      {game.name}
                    </option>
                  ))}
                </select>
              </div>

              {hasActiveFilters && (
                <button className="clear-filters-btn" onClick={clearAllFilters}>
                  Сбросить ✕
                </button>
              )}
            </div>

            {hasActiveFilters && (
              <div className="active-filters-simple">
                {filters.search && (
                  <span className="active-filter-badge">
                    Поиск: "{filters.search}"
                  </span>
                )}
                {filters.game && (
                  <span className="active-filter-badge">
                    Игра: {games.find(g => g.id === parseInt(filters.game))?.name}
                  </span>
                )}
              </div>
            )}
          </section>

          <section className="profiles-section">
            <div className="section-header">
              <h2 className="section-title">
                {filters.search ? `Результаты поиска "${filters.search}"` : 'Игроки для вас'}
              </h2>
              <div className="results-count">
                {profiles.length > 0 && `Найдено: ${profiles.length} игроков`}
              </div>
            </div>
            
            {loading ? (
              <div className="loading">
                <div className="loading-spinner"></div>
                <p>Загрузка игроков...</p>
              </div>
            ) : profiles.length === 0 ? (
              <div className="empty-state">
                <h3>Игроки не найдены</h3>
                <p>Попробуйте изменить параметры поиска</p>
              </div>
            ) : (
              <div className="profiles-grid">
                {profiles.map(profile => (
                  <PartnerCard
                    key={profile.id}
                    partner={profile}
                    onSendRequest={handleSendFriendRequest}
                    onRemoveFriend={handleRemoveFriend}
                    isAuthenticated={isAuthenticated}
                    currentUserId={user?.id ? String(user.id) : undefined}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      <button 
        className="video-floating-btn"
        onClick={handleVideoButtonClick}
        aria-label="Открыть видео"
      >
        <span className="video-icon">▶</span>
      </button>
      
      <Footer />
    </div>
  );
};

export default Home;