import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, partnersAPI, gamesAPI } from '../services/api';
import type { UserProfile } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../utils/avatar';
import '../styles/Profile.css';

interface Game {
  id: number;
  name: string;
  image_url?: string;
}

interface UserGame {
  id: number;
  game: Game;
  hours_played: number;
}

interface Friend {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

interface Post {
  id: number;
  author: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  time: string;
  game?: string;
  photos: string[];
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showGamesModal, setShowGamesModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [postContent, setPostContent] = useState<string>('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Загрузка профиля...');
        
        const response = await authAPI.getProfile();
        console.log('Данные профиля:', response.data);
        
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        setError('');
        
        // Загружаем игры пользователя
        await loadUserGames();
        
      } catch (error: any) {
        console.error('Ошибка загрузки профиля:', error);
        
        if (error.response?.status === 401) {
          setError('Сессия истекла. Войдите снова.');
          localStorage.clear();
          navigate('/login');
        } else {
          setError('Ошибка загрузки профиля');
        }
      }
      setIsLoading(false);
    };
    
    fetchProfile();
  }, [navigate]);

  // Загрузка друзей после получения user
  useEffect(() => {
    if (user) {
      loadUserFriends();
    }
  }, [user]);

  const loadUserGames = async () => {
    try {
      const response = await gamesAPI.getUserGames();
      setUserGames(response.data);
    } catch (error) {
      console.error('Ошибка загрузки игр пользователя:', error);
    }
  };

  const loadUserFriends = async () => {
    try {
      if (user) {
        const userId = typeof user.id === 'string' ? user.id : String(user.id);
        const response = await partnersAPI.getUserFriends(userId);
        setUserFriends(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    navigate('/edit-profile');
    setShowMenu(false);
  };

  const handleShowPosts = () => {
    navigate('/posts');
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newFiles = [...selectedFiles, ...files].slice(0, 10);
      setSelectedFiles(newFiles);
      
      const newPreviewUrls = newFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(newPreviewUrls);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previewUrls[index]);
    
    setSelectedFiles(newFiles);
    setPreviewUrls(newPreviewUrls);
  };

  const handleCreatePost = () => {
    if (!postContent.trim() && selectedFiles.length === 0) {
      alert('Добавьте текст или фотографии для создания поста');
      return;
    }
    
    console.log('Создание поста:', { content: postContent, files: selectedFiles });
    
    const newPost: Post = {
      id: Date.now(),
      author: user?.username || 'User',
      content: postContent || 'Новый пост',
      likes: 0,
      comments: 0,
      shares: 0,
      time: 'Только что',
      photos: [...previewUrls]
    };
    
    setUserPosts(prev => [newPost, ...prev]);
    
    setPostContent('');
    setSelectedFiles([]);
    
    previewUrls.forEach(url => URL.revokeObjectURL(url));
    setPreviewUrls([]);
    setShowCreatePostModal(false);
  };

  // Отображаемые данные
  const displayedGames = userGames.slice(0, 3);
  const displayedFriends = userFriends.slice(0, 3);
  const displayedPosts = userPosts.length > 0 ? userPosts : [];

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="profile-container">
          {isLoading ? (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <h3>Загрузка профиля...</h3>
            </div>
          ) : error ? (
            <div className="error-container">
              <h3>Ошибка</h3>
              <p>{error}</p>
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={() => navigate('/login')}>Перейти ко входу</button>
                <button className="btn btn-secondary" onClick={() => window.location.reload()}>Обновить страницу</button>
              </div>
            </div>
          ) : user ? (
            <>
              {/* Шапка профиля */}
              <div className="profile-header-section">
                <div className="profile-cover">
                  <div className="cover-overlay"></div>
                </div>
                
                <div className="profile-header-content">
                  <div className="profile-main-info">
                    <div className="profile-avatar-large">
                      <img 
                        src={getAvatarUrl(user?.avatar)} 
                        alt="Avatar" 
                        className="profile-avatar-img"
                        onError={handleImageError}
                      />
                    </div>
                    
                    <div className="profile-text-info">
                      <h1 className="profile-username-large">{user.username}</h1>
                      <p className="profile-bio">{user.bio || 'Пользователь не добавил информацию о себе'}</p>
                    </div>
                  </div>
                  
                  {/* Кнопка меню */}
                  <div className="profile-menu-container">
                    <button 
                      className="profile-menu-btn"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      <span className="menu-dots">⋯</span>
                    </button>
                    
                    {showMenu && (
                      <div className="profile-dropdown-menu">
                        <button className="dropdown-item" onClick={handleEditProfile}>
                          <span className="dropdown-icon">✏️</span>
                          Редактировать профиль
                        </button>
                        <button className="dropdown-item" onClick={handleShowPosts}>
                          <span className="dropdown-icon">📝</span>
                          Мои посты
                        </button>
                        <button className="dropdown-item" onClick={() => setShowFriendsModal(true)}>
                          <span className="dropdown-icon">👥</span>
                          Все друзья
                        </button>
                        <div className="dropdown-divider"></div>
                        <button className="dropdown-item logout-item" onClick={handleLogout}>
                          <span className="dropdown-icon">🚪</span>
                          Выйти
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Основной контент */}
              <div className="profile-main-layout">
                {/* Левая колонка - Посты */}
                <div className="posts-column">
                  {/* Кнопка создания поста */}
                  <div className="create-post-card">
                    <div className="create-post-header">
                      <div className="create-post-avatar">
                        <img 
                          src={getAvatarUrl(user?.avatar)} 
                          alt={user.username}
                          onError={handleImageError}
                        />
                      </div>
                      <button 
                        className="create-post-input"
                        onClick={() => setShowCreatePostModal(true)}
                      >
                        Что у вас нового, {user.username}?
                      </button>
                    </div>
                  </div>
                  
                  {/* Список постов */}
                  {displayedPosts.length === 0 ? (
                    <div className="empty-posts">
                      <p>У вас пока нет постов. Создайте первый пост!</p>
                    </div>
                  ) : (
                    displayedPosts.map(post => (
                      <div key={post.id} className="post-card">
                        <div className="post-header">
                          <div className="post-author">
                            <div className="post-avatar">
                              <img 
                                src={getAvatarUrl(user?.avatar)} 
                                alt={post.author}
                                onError={handleImageError}
                              />
                            </div>
                            <div className="post-author-info">
                              <span className="post-author-name">{post.author}</span>
                              <span className="post-time">{post.time}</span>
                            </div>
                          </div>
                          {post.game && <span className="post-game-tag">{post.game}</span>}
                        </div>
                        
                        <div className="post-content">
                          <p>{post.content}</p>
                        </div>
                        
                        {/* Фотографии поста */}
                        {post.photos && post.photos.length > 0 && (
                          <div className="post-photos">
                            {post.photos.length === 1 ? (
                              <div className="single-photo">
                                <img src={post.photos[0]} alt="Post" />
                              </div>
                            ) : (
                              <div className="multiple-photos">
                                {post.photos.slice(0, 4).map((photo, index) => (
                                  <div key={index} className="photo-item">
                                    <img src={photo} alt={`Post ${index + 1}`} />
                                    {index === 3 && post.photos.length > 4 && (
                                      <div className="photos-overlay">
                                        +{post.photos.length - 4}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="post-stats">
                          <div className="post-stat">
                            <span className="stat-count">{post.likes} ❤️</span>
                          </div>
                          <div className="post-stat">
                            <span className="stat-count">{post.comments} 💬</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                {/* Правая колонка - Игры и друзья */}
                <div className="sidebar-column">
                  {/* Блок игр */}
                  <div className="sidebar-card">
                    <div className="sidebar-card-header">
                      <h3 className="sidebar-card-title">Мои игры</h3>
                      {userGames.length > 0 && (
                        <button 
                          className="sidebar-show-all"
                          onClick={() => setShowGamesModal(true)}
                        >
                          Все
                        </button>
                      )}
                    </div>
                    
                    {displayedGames.length === 0 ? (
                      <p className="empty-placeholder">Нет добавленных игр</p>
                    ) : (
                      <div className="games-list">
                        {displayedGames.map(userGame => (
                          <div key={userGame.id} className="game-item">
                            <span className="game-name">{userGame.game.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Блок друзей */}
                  <div className="sidebar-card">
                    <div className="sidebar-card-header">
                      <h3 className="sidebar-card-title">Друзья</h3>
                      {userFriends.length > 0 && (
                        <button 
                          className="sidebar-show-all"
                          onClick={() => setShowFriendsModal(true)}
                        >
                          Все
                        </button>
                      )}
                    </div>
                    
                    {displayedFriends.length === 0 ? (
                      <p className="empty-placeholder">Нет друзей</p>
                    ) : (
                      <div className="friends-mini-list">
                        {displayedFriends.map(friend => (
                          <div key={friend.id} className="friend-mini-item">
                            <div className="friend-mini-avatar">
                              <img 
                                src={getAvatarUrl(friend.avatar)} 
                                alt={friend.username}
                                onError={handleImageError}
                              />
                            </div>
                            <span className="friend-mini-name">{friend.username}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Модалка создания поста */}
              {showCreatePostModal && (
                <div className="modal-overlay" onClick={() => setShowCreatePostModal(false)}>
                  <div className="modal-content create-post-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Создать пост</h2>
                      <button 
                        className="modal-close"
                        onClick={() => setShowCreatePostModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="create-post-modal-content">
                      <div className="create-post-modal-author">
                        <img 
                          src={getAvatarUrl(user?.avatar)} 
                          alt={user?.username}
                          className="create-post-modal-avatar"
                          onError={handleImageError}
                        />
                        <div>
                          <h3>{user?.username}</h3>
                          <select className="post-privacy-select">
                            <option value="public">Публичный</option>
                            <option value="friends">Друзья</option>
                            <option value="onlyme">Только я</option>
                          </select>
                        </div>
                      </div>
                      
                      <textarea 
                        className="create-post-textarea"
                        placeholder="Что у вас нового?"
                        value={postContent}
                        onChange={(e) => setPostContent(e.target.value)}
                        rows={6}
                      />
                      
                      {/* Превью фотографий */}
                      {previewUrls.length > 0 && (
                        <div className="post-photos-preview">
                          <h4>Фотографии ({selectedFiles.length}/10)</h4>
                          <div className="photos-preview-grid">
                            {previewUrls.map((url, index) => (
                              <div key={index} className="photo-preview-item">
                                <img src={url} alt={`Preview ${index + 1}`} />
                                <button 
                                  className="remove-photo-btn"
                                  onClick={() => removeFile(index)}
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="create-post-modal-actions">
                        <div className="modal-action-buttons">
                          <label className="modal-action-btn">
                            <input 
                              type="file" 
                              multiple 
                              accept="image/*"
                              onChange={handleFileSelect}
                              style={{ display: 'none' }}
                            />
                            <span className="modal-action-icon">📷</span>
                            Фото/Видео
                          </label>
                          <button className="modal-action-btn">
                            <span className="modal-action-icon">🏷️</span>
                            Отметить друзей
                          </button>
                          <button className="modal-action-btn">
                            <span className="modal-action-icon">📍</span>
                            Отметить место
                          </button>
                        </div>
                        
                        <div className="modal-submit-actions">
                          <button 
                            className="btn btn-secondary"
                            onClick={() => setShowCreatePostModal(false)}
                          >
                            Отмена
                          </button>
                          <button 
                            className="btn btn-primary"
                            onClick={handleCreatePost}
                            disabled={!postContent.trim() && selectedFiles.length === 0}
                          >
                            Опубликовать
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Модалка игр */}
              {showGamesModal && (
                <div className="modal-overlay" onClick={() => setShowGamesModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Мои игры</h2>
                      <button 
                        className="modal-close"
                        onClick={() => setShowGamesModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="modal-games-grid">
                      {userGames.map(userGame => (
                        <div key={userGame.id} className="modal-game-card">
                          <h3 className="modal-game-name">{userGame.game.name}</h3>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {/* Модалка друзей */}
              {showFriendsModal && (
                <div className="modal-overlay" onClick={() => setShowFriendsModal(false)}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                      <h2 className="modal-title">Мои друзья</h2>
                      <button 
                        className="modal-close"
                        onClick={() => setShowFriendsModal(false)}
                      >
                        ✕
                      </button>
                    </div>
                    
                    <div className="modal-friends-list">
                      {userFriends.map(friend => (
                        <div key={friend.id} className="modal-friend-item">
                          <img 
                            src={getAvatarUrl(friend.avatar)} 
                            alt={friend.username}
                            className="modal-friend-avatar"
                            onError={handleImageError}
                          />
                          <div className="modal-friend-info">
                            <h3 className="modal-friend-name">{friend.username}</h3>
                            <button className="btn btn-secondary modal-friend-btn">
                              Написать
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="empty-container">
              <h3>Данные пользователя не найдены</h3>
              <div className="action-buttons">
                <button className="btn btn-primary" onClick={() => window.location.reload()}>Обновить страницу</button>
                <button className="btn btn-secondary" onClick={() => navigate('/login')}>Войти</button>
              </div>
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Profile;