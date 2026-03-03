import React, { useState, useEffect } from 'react';
import { gamesAPI, Game as APIGame } from '../../services/api';
import '../../styles/GamesCarousel.css';

interface CarouselGame {
  id: number;
  name: string;
  image_url?: string | null;
  color?: string;
}

const GamesCarousel: React.FC = () => {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [visibleCount, setVisibleCount] = useState<number>(4);
  const [games, setGames] = useState<CarouselGame[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Цвета по умолчанию для карточек (если нет изображения)
  const defaultColors = [
    "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", 
    "#FFEAA7", "#DDA0DD", "#FFB347", "#B19CD9",
    "#77DD77", "#AEC6CF", "#F49AC2", "#FF6961"
  ];

  // Загрузка игр из API
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await gamesAPI.getAllGames();
      console.log('GamesCarousel API Response:', response.data);
      
      if (response.data && Array.isArray(response.data)) {
        const gamesData: APIGame[] = response.data;
        
        // Преобразуем данные API в формат карусели
        const carouselGames: CarouselGame[] = gamesData.map((game, index) => ({
          id: game.id,
          name: game.name,
          image_url: game.image_url || null,
          color: defaultColors[index % defaultColors.length] // Циклическое распределение цветов
        }));
        
        setGames(carouselGames);
      } else {
        // Если API не вернул данные, используем заглушки
        setGames([
          { id: 1, name: "BBIES", image_url: null, color: "#FF6B6B" },
          { id: 2, name: "ILK", image_url: null, color: "#4ECDC4" },
          { id: 3, name: "E-CHAT", image_url: null, color: "#45B7D1" },
          { id: 4, name: "MILC", image_url: null, color: "#96CEB4" },
          { id: 5, name: "Game 5", image_url: null, color: "#FFEAA7" },
          { id: 6, name: "Game 6", image_url: null, color: "#DDA0DD" },
        ]);
      }
    } catch (err: any) {
      console.error('Error fetching games for carousel:', err);
      setError('Ошибка при загрузке игр');
      
      // В случае ошибки показываем заглушки
      setGames([
        { id: 1, name: "BBIES", image_url: null, color: "#FF6B6B" },
        { id: 2, name: "ILK", image_url: null, color: "#4ECDC4" },
        { id: 3, name: "E-CHAT", image_url: null, color: "#45B7D1" },
        { id: 4, name: "MILC", image_url: null, color: "#96CEB4" },
        { id: 5, name: "Game 5", image_url: null, color: "#FFEAA7" },
        { id: 6, name: "Game 6", image_url: null, color: "#DDA0DD" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Автоматически определяем количество видимых игр
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setVisibleCount(2);
      } else if (window.innerWidth < 1024) {
        setVisibleCount(3);
      } else {
        setVisibleCount(4);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Автопрокрутка (только если есть игры и не грузим)
  useEffect(() => {
    if (games.length === 0 || loading) return;
    
    const interval = setInterval(() => {
      if (games.length <= visibleCount) return; // Не прокручиваем если все игры видны
      
      if (currentIndex < games.length - visibleCount) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(0);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [currentIndex, games.length, visibleCount, loading]);

  const nextSlide = () => {
    if (games.length === 0 || loading) return;
    
    if (games.length <= visibleCount) return; // Не прокручиваем если все игры видны
    
    if (currentIndex < games.length - visibleCount) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const prevSlide = () => {
    if (games.length === 0 || loading) return;
    
    if (games.length <= visibleCount) return; // Не прокручиваем если все игры видны
    
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(games.length - visibleCount);
    }
  };

  // Обработчик ошибки загрузки изображения
  const handleImageError = (e: React.SyntheticEvent<HTMLDivElement, Event>, gameId: number) => {
    const element = e.currentTarget;
    element.style.backgroundImage = 'none';
    
    // Обновляем состояние, чтобы убрать битую картинку
    setGames(prev => prev.map(game => 
      game.id === gameId ? { ...game, image_url: null } : game
    ));
  };

  if (loading) {
    return (
      <div className="games-carousel">
        <div className="carousel-header">
          <h2>Popular Games</h2>
        </div>
        <div className="carousel-loading">
          <div className="loading-spinner"></div>
          <p>Загрузка игр...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="games-carousel">
      <div className="carousel-header">
        <h2>Popular Games</h2>
        {games.length > visibleCount && (
          <div className="carousel-controls">
            <button 
              className="control-btn prev" 
              onClick={prevSlide}
              disabled={loading}
            >
              ‹
            </button>
            <button 
              className="control-btn next" 
              onClick={nextSlide}
              disabled={loading}
            >
              ›
            </button>
          </div>
        )}
      </div>

      {error && !games.length ? (
        <div className="carousel-error">
          <p>{error}</p>
          <button onClick={fetchGames} className="retry-btn">
            Повторить
          </button>
        </div>
      ) : games.length === 0 ? (
        <div className="carousel-empty">
          <p>Нет доступных игр</p>
        </div>
      ) : (
        <div className="carousel-container">
          <div 
            className="carousel-track"
            style={{ 
              transform: `translateX(-${currentIndex * (100 / visibleCount)}%)` 
            }}
          >
            {games.map((game) => (
              <div 
                key={game.id} 
                className="game-card"
                style={{ width: `${100 / visibleCount}%` }}
              >
                <div 
                  className="game-image"
                  style={{ 
                    backgroundColor: game.color || '#2a2a2a',
                    backgroundImage: game.image_url ? `url(${game.image_url})` : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                  onError={(e) => handleImageError(e, game.id)}
                >
                  {!game.image_url && (
                    <div className="game-title">{game.name}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {/* Индикаторы текущей позиции */}
          {games.length > visibleCount && (
            <div className="carousel-indicators">
              {Array.from({ length: games.length - visibleCount + 1 }).map((_, index) => (
                <button
                  key={index}
                  className={`indicator ${index === currentIndex ? 'active' : ''}`}
                  onClick={() => setCurrentIndex(index)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GamesCarousel;