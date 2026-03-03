import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import GamesCarousel from '../components/common/GamesCarousel';
import ProfileCard from '../components/profiles/ProfileCard';
import { partnersAPI, gamesAPI } from '../services/api';
import '../styles/Home.css';

interface Game {
  id: number;
  name: string;
  image_url?: string;
  color?: string;
}

interface Profile {
  id: number;
  user: {
    id: number;
    username: string;
    avatar_url?: string;
  };
  rating?: number;
  rank?: string;
  playtime?: number;
  followers_count?: number;
  favorite_game?: string | null;
  bio?: string;
}

interface Filters {
  game: string;
  sortBy: string;
  search: string;
  rank: string;
}

const Home: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({
    game: '',
    sortBy: 'rating',
    search: '',
    rank: ''
  });
  const [showFilters, setShowFilters] = useState<boolean>(false);

  // Загрузка игр для фильтров
  useEffect(() => {
    loadGames();
  }, []);

  // Загрузка профилей
  useEffect(() => {
    loadProfiles();
  }, []);

  const loadGames = async () => {
    try {
      const response = await gamesAPI.getAllGames();
      // Добавляем цвета для игр (как в твоём примере)
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
      // Преобразуем данные из API в формат Profile
      const formattedProfiles = response.data.map((partner: any, index: number) => ({
        id: index + 1,
        user: {
          id: index + 1,
          username: partner.username,
          avatar_url: partner.avatar
        },
        favorite_game: partner.favorite_game,
        bio: partner.bio,
        rating: 4.5,
        rank: 'intermediate',
        playtime: 100,
        followers_count: 50
      }));
      setProfiles(formattedProfiles);
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

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        {/* Основной контент с отступами по бокам */}
        <div className="content-container">
          {/* Широкий темный баннер */}
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

          {/* Рекламные баннеры */}
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

          {/* Карусель игр */}
          <GamesCarousel />

          {/* Поиск и фильтры */}
          <section className="filters-section">
            <div className="filters-header">
              <div className="search-box compact">
                <span className="search-icon">🔍</span>
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
                  <span className="filter-icon">⚙️</span>
                  Фильтры
                  {hasActiveFilters && <span className="filter-badge"></span>}
                </button>
                
                {hasActiveFilters && (
                  <button className="clear-filters" onClick={clearAllFilters}>
                    <span className="filter-icon">✕</span>
                    Сбросить
                  </button>
                )}
              </div>
            </div>

            {/* Расширенные фильтры */}
            {showFilters && (
              <div className="filters-expanded">
                <div className="filters-grid compact">
                  <div className="filter-group compact">
                    <span className="filter-icon">🎮</span>
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
                    <span className="filter-icon">↕️</span>
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
                    <span className="filter-icon">🏆</span>
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

            {/* Активные фильтры */}
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

          {/* Профили игроков */}
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
                  <ProfileCard key={profile.id} profile={profile} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Home;