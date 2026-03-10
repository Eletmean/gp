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

interface Filters {
  game: string;
  sortBy: string;
  search: string;
  rank: string;
}

const Home: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<Partner[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    game: '',
    sortBy: 'rating',
    search: '',
    rank: ''
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  useEffect(() => {
    loadGames();
  }, []);

  useEffect(() => {
    loadProfiles();
  }, []);

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
      setProfiles(response.data);
    } catch (error) {
      console.error('Error loading profiles:', error);
    } finally {
      setLoading(false);
    }
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
      sortBy: 'rating',
      search: '',
      rank: ''
    });
  };

  const hasActiveFilters = filters.search || filters.game || filters.rank || filters.sortBy !== 'rating';

  const handleSendFriendRequest = async (partnerId: string) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
      alert('Чтобы добавить в друзья, нужно войти в систему');
      return;
    }

    try {
      await partnersAPI.sendFriendRequest(partnerId);
      setProfiles(prev => prev.map(p => 
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
      setProfiles(prev => prev.map(p => 
        p.id === partnerId ? { ...p, is_friend: false, friendship_status: null } : p
      ));
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(err.response?.data?.detail || 'Ошибка при удалении из друзей');
    }
  };

  const handleVideoButtonClick = () => {
    console.log('Кнопка видео нажата');
    // Здесь потом будет логика открытия видео
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
            <div className="filters-header">
              <div className="search-box compact">
                <input
                  type="text"
                  placeholder="Поиск по нику, игре..."
                  value={filters.search}
                  onChange={handleSearchChange}
                  className="search-input"
                />
              </div>
              
              <div className="filter-buttons">
                <button 
                  className={`filter-toggle ${showFilters ? 'active' : ''}`}
                  onClick={() => setShowFilters(!showFilters)}
                >
                  Фильтры
                  {hasActiveFilters && <span className="filter-badge"></span>}
                </button>
                
                {hasActiveFilters && (
                  <button className="clear-filters" onClick={clearAllFilters}>
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            {showFilters && (
              <div className="filters-expanded">
                <div className="filters-grid compact">
                  <div className="filter-group compact">
                    <select 
                      value={filters.game}
                      onChange={(e) => handleFilterChange('game', e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Все игры</option>
                      {games.map(game => (
                        <option key={game.id} value={game.id}>
                          {game.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="filter-group compact">
                    <select 
                      value={filters.sortBy}
                      onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                      className="filter-select"
                    >
                      <option value="rating">По рейтингу</option>
                      <option value="rank">По рангу</option>
                      <option value="playtime">По времени в игре</option>
                      <option value="followers">По подписчикам</option>
                      <option value="newest">Сначала новые</option>
                    </select>
                  </div>

                  <div className="filter-group compact">
                    <select 
                      value={filters.rank}
                      onChange={(e) => handleFilterChange('rank', e.target.value)}
                      className="filter-select"
                    >
                      <option value="">Любой ранг</option>
                      <option value="beginner">Начинающий</option>
                      <option value="intermediate">Средний</option>
                      <option value="advanced">Продвинутый</option>
                      <option value="expert">Эксперт</option>
                      <option value="pro">Профессионал</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {hasActiveFilters && (
              <div className="active-filters compact">
                {filters.search && (
                  <span className="active-filter">
                    Поиск: "{filters.search}"
                    <button onClick={() => handleFilterChange('search', '')}>×</button>
                  </span>
                )}
                {filters.game && (
                  <span className="active-filter">
                    Игра: {games.find(g => g.id === parseInt(filters.game))?.name}
                    <button onClick={() => handleFilterChange('game', '')}>×</button>
                  </span>
                )}
                {filters.rank && (
                  <span className="active-filter">
                    Ранг: {filters.rank}
                    <button onClick={() => handleFilterChange('rank', '')}>×</button>
                  </span>
                )}
                {filters.sortBy !== 'rating' && (
                  <span className="active-filter">
                    Сортировка: {
                      filters.sortBy === 'rank' ? 'По рангу' :
                      filters.sortBy === 'playtime' ? 'По времени в игре' :
                      filters.sortBy === 'followers' ? 'По подписчикам' :
                      filters.sortBy === 'newest' ? 'Сначала новые' :
                      filters.sortBy
                    }
                    <button onClick={() => handleFilterChange('sortBy', 'rating')}>×</button>
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
                <p>Попробуйте изменить параметры поиска или фильтры</p>
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