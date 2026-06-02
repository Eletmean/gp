import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import '../styles/Games.css';
import { gamesAPI, Game, partnersAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../utils/avatar';

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

const Games: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [gamePlayers, setGamePlayers] = useState<Partner[]>([]);
  const [showPlayersModal, setShowPlayersModal] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
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

  const findPlayersByGame = async (game: Game) => {
    // Убираем проверку авторизации
    setSelectedGame(game);
    setLoadingPlayers(true);
    setShowPlayersModal(true);
    
    try {
      const response = await partnersAPI.getAll();
      const players = response.data.filter(partner => 
        partner.favorite_game === game.name
      );
      setGamePlayers(players);
    } catch (error) {
      console.error('Error loading players:', error);
    } finally {
      setLoadingPlayers(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleFindPlayer = (game: Game) => {
    findPlayersByGame(game);
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
                        onClick={() => handleFindPlayer(game)}
                        className="game-action-btn find-player-btn"
                      >
                        Найти игрока
                      </button>
                    </div>
                  </div>
                  
                  <div className="game-content">
                    <h3 className="game-name">{game.name}</h3>
                    
                    <div className="game-actions">
                      <button 
                        onClick={() => handleFindPlayer(game)}
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

      {showPlayersModal && (
        <div className="modal-overlay" onClick={() => setShowPlayersModal(false)}>
          <div className="modal-content players-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Игроки в {selectedGame?.name}
              </h2>
              <button 
                className="modal-close"
                onClick={() => setShowPlayersModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="modal-body">
              {loadingPlayers ? (
                <div className="loading-players">
                  <div className="loading-spinner-small"></div>
                  <p>Загрузка игроков...</p>
                </div>
              ) : gamePlayers.length === 0 ? (
                <div className="no-players">
                  <p>Игроки, которые играют в {selectedGame?.name}, не найдены</p>
                  <p className="no-players-hint">Попробуйте поискать в других играх</p>
                </div>
              ) : (
                <div className="players-list">
                  {gamePlayers.map(player => (
                    <div key={player.id} className="player-item">
                      <img 
                        src={getAvatarUrl(player.avatar)} 
                        alt={player.username}
                        className="player-avatar"
                        onError={handleImageError}
                      />
                      <div className="player-info">
                        <div className="player-name">{player.first_name || player.username}</div>
                        <div className="player-username">@{player.username}</div>
                        {player.bio && (
                          <div className="player-bio">{player.bio.substring(0, 60)}...</div>
                        )}
                      </div>
                      <Link 
                        to={`/partner/${player.id}`} 
                        className="btn btn-outline btn-sm"
                        onClick={() => setShowPlayersModal(false)}
                      >
                        Профиль
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Games;