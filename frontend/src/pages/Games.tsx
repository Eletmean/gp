import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import '../styles/Games.css';
import { gamesAPI, Game } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

const Games: React.FC = () => {
  const { user } = useAuth(); // получаем пользователя из контекста
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    // Фильтрация игр по поисковому запросу
    if (searchQuery.trim() === '') {
      setFilteredGames(games);
    } else {
      const filtered = games.filter(game =>
        game.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredGames(filtered);
    }
  }, [searchQuery, games]);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await gamesAPI.getAllGames();
      console.log('API Response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const gamesData = response.data;
        setGames(gamesData);
        setFilteredGames(gamesData);
      }
    } catch (err: any) {
      console.error('Error fetching games:', err);
      setError('Ошибка при загрузке игр. Попробуйте обновить страницу.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFindPlayer = (gameId: number) => {
    if (!user) {
      alert('Для поиска игроков необходимо войти в систему');
      return;
    }
    alert(`Поиск игроков для игры ID: ${gameId} (функционал в разработке)`);
  };

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="games-container">
          <div className="games-header">
            <h1 className="games-title">Игры</h1>
            <p className="games-subtitle">
              Ищите игры, находите игроков и присоединяйтесь к сообществу
            </p>
          </div>

          {/* Поиск и фильтры */}
          <div className="games-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Поиск игры по названию..."
                value={searchQuery}
                onChange={handleSearch}
                className="games-search"
              />
            </div>
            
            <div className="games-stats">
              <span className="games-count">
                Найдено игр: {filteredGames.length}
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
              <p>Загрузка игр...</p>
            </div>
          ) : error ? (
            <div className="error-container">
              <p className="error-message">{error}</p>
              <button onClick={fetchGames} className="retry-btn">
                Попробовать снова
              </button>
            </div>
          ) : filteredGames.length === 0 ? (
            <div className="no-games">
              <div className="no-games-icon">🎮</div>
              <h3>Игры не найдены</h3>
              {games.length === 0 ? (
                <p>В базе данных пока нет игр</p>
              ) : (
                <p>Попробуйте изменить поисковый запрос</p>
              )}
              <button 
                onClick={() => setSearchQuery('')}
                className="btn btn-primary"
              >
                Показать все игры
              </button>
            </div>
          ) : (
            // Сетка игр - все на одной странице
            <div className="games-grid">
              {filteredGames.map((game) => (
                <div key={game.id} className="game-card">
                  <div className="game-image-container">
                    <img 
                      src={game.image_url || '/default-game.png'} 
                      alt={game.name}
                      className="game-image"
                      onError={(e) => {
                        e.currentTarget.src = '/default-game.png';
                      }}
                    />
                    <div className="game-overlay">
                      <button 
                        onClick={() => handleFindPlayer(game.id)}
                        className="game-action-btn find-player-btn"
                      >
                        👥 Найти игрока
                      </button>
                    </div>
                  </div>
                  
                  <div className="game-content">
                    <h3 className="game-name">{game.name}</h3>
                    
                    <div className="game-actions">
                      <button 
                        onClick={() => handleFindPlayer(game.id)}
                        className="btn btn-primary"
                      >
                        Найти игрока
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Games;