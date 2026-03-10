import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, partnersAPI, gamesAPI, postsAPI } from '../services/api';
import type { UserProfile, Post as APIPost, FriendRequest } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError as handleAvatarError } from '../utils/avatar';
import { getImageUrl, handleImageError } from '../utils/image';
import CreatePost from '../components/CreatePost';
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
  authorId: string | number;
  authorAvatar?: string;
  content: string;
  likes: number;
  comments: number;
  time: string;
  privacy: string;
  photos: string[];
  isLiked?: boolean;
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showGamesModal, setShowGamesModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);

  const loadUserGames = useCallback(async () => {
    try {
      const response = await gamesAPI.getUserGames();
      setUserGames(response.data);
    } catch (error) {
      console.error('Ошибка загрузки игр пользователя:', error);
    }
  }, []);

  const loadUserFriends = useCallback(async () => {
    try {
      if (user) {
        const userId = typeof user.id === 'string' ? user.id : String(user.id);
        const response = await partnersAPI.getUserFriends(userId);
        setUserFriends(response.data);
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  }, [user]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const response = await partnersAPI.getFriendRequests();
      setFriendRequests(response.data);
    } catch (error) {
      console.error('Ошибка загрузки запросов в друзья:', error);
    }
  }, []);

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await partnersAPI.acceptFriendRequest(requestId);
      await loadFriendRequests();
      if (user) {
        await loadUserFriends();
      }
    } catch (error) {
      console.error('Ошибка при принятии запроса:', error);
      alert('Не удалось принять запрос');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await partnersAPI.rejectFriendRequest(requestId);
      await loadFriendRequests();
    } catch (error) {
      console.error('Ошибка при отклонении запроса:', error);
      alert('Не удалось отклонить запрос');
    }
  };

  const loadUserPosts = useCallback(async (userId: string | number) => {
    try {
      setPostsLoading(true);
      const id = typeof userId === 'string' ? userId : String(userId);
      const response = await postsAPI.getUserPosts(id);
      console.log('Загруженные посты:', response.data);
      
      const formattedPosts: Post[] = response.data.posts.map((post: APIPost) => ({
        id: post.id,
        author: post.author.username,
        authorId: post.author.id,
        authorAvatar: post.author.avatar,
        content: post.content,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        time: new Date(post.created_at).toLocaleString(),
        privacy: post.privacy,
        photos: post.images.map(img => img.image_url),
        isLiked: post.is_liked
      }));
      
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        console.log('Загрузка профиля...');
        
        const response = await authAPI.getProfile();
        console.log('Данные профиля:', response.data);
        
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        setError('');
        
        await loadUserGames();
        await loadFriendRequests();
        
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
  }, [navigate, loadUserGames, loadFriendRequests]);

  useEffect(() => {
    if (user) {
      loadUserFriends();
      loadUserPosts(user.id);
    }
  }, [user, loadUserFriends, loadUserPosts]);

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

  const handlePostCreated = () => {
    if (user) {
      loadUserPosts(user.id);
    }
  };

  const handleLikePost = async (postId: number) => {
    try {
      await postsAPI.likePost(postId);
      setUserPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes + 1, isLiked: true }
          : post
      ));
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleUnlikePost = async (postId: number) => {
    try {
      await postsAPI.unlikePost(postId);
      setUserPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, likes: post.likes - 1, isLiked: false }
          : post
      ));
    } catch (error) {
      console.error('Error unliking post:', error);
    }
  };

  const handleDeletePost = async (postId: number) => {
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      return;
    }
    
    try {
      await postsAPI.deletePost(postId);
      setUserPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Ошибка при удалении поста');
    }
  };

  // Отображаемые данные
  const displayedGames = userGames.slice(0, 3);
  const displayedFriends = userFriends.slice(0, 3);
  const displayedPosts = userPosts;

  // Полное имя пользователя
  const getFullName = () => {
    if (user?.first_name && user?.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user?.first_name) {
      return user.first_name;
    } else if (user?.last_name) {
      return user.last_name;
    } else {
      return user?.username || 'Пользователь';
    }
  };

  const getPrivacyLabel = (privacy: string) => {
    switch (privacy) {
      case 'public': return 'Публичный';
      case 'friends': return 'Друзья';
      case 'private': return 'Только я';
      default: return 'Публичный';
    }
  };

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
                        onError={handleAvatarError}
                      />
                    </div>
                    
                    <div className="profile-text-info">
                      <h1 className="profile-username-large">{getFullName()}</h1>
                      <p className="profile-bio">{user.bio || 'Пользователь не добавил информацию о себе'}</p>
                      
                      {user.favorite_game && (
                        <div className="profile-favorite-game">
                          <span className="favorite-game-label">Любимая игра:</span>
                          <span className="favorite-game-name">{user.favorite_game}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Кнопка меню и уведомления */}
                  <div className="profile-menu-container">
                    {/* Кнопка уведомлений */}
                    <div className="notifications-container">
                      <button 
                        className={`notifications-btn ${friendRequests.length > 0 ? 'has-notifications' : ''}`}
                        onClick={() => setShowNotifications(!showNotifications)}
                      >
                        Уведомления
                        {friendRequests.length > 0 && (
                          <span className="notifications-badge">{friendRequests.length}</span>
                        )}
                      </button>
                      
                      {/* Выпадающее меню уведомлений */}
                      {showNotifications && (
                        <div className="notifications-dropdown">
                          <div className="notifications-header">
                            <h3>Уведомления</h3>
                            <button onClick={() => setShowNotifications(false)}>✕</button>
                          </div>
                          <div className="notifications-list">
                            {friendRequests.length === 0 ? (
                              <div className="no-notifications">Нет новых уведомлений</div>
                            ) : (
                              friendRequests.map(request => (
                                <div key={request.id} className="notification-item">
                                  <img 
                                    src={getAvatarUrl(request.from_user?.avatar)} 
                                    alt={request.from_user?.username}
                                    className="notification-avatar"
                                    onError={handleAvatarError}
                                  />
                                  <div className="notification-content">
                                    <p>
                                      <strong>{request.from_user?.first_name} {request.from_user?.last_name}</strong>
                                      <br />
                                      <span className="notification-text">хочет добавить вас в друзья</span>
                                    </p>
                                    <div className="notification-actions">
                                      <button 
                                        className="btn btn-primary btn-sm"
                                        onClick={() => handleAcceptRequest(request.id)}
                                      >
                                        Принять
                                      </button>
                                      <button 
                                        className="btn btn-secondary btn-sm"
                                        onClick={() => handleRejectRequest(request.id)}
                                      >
                                        Отклонить
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <button 
                      className="profile-menu-btn"
                      onClick={() => setShowMenu(!showMenu)}
                    >
                      Меню
                    </button>
                    
                    {showMenu && (
                      <div className="profile-dropdown-menu">
                        <button className="dropdown-item" onClick={handleEditProfile}>
                          Редактировать профиль
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
                          onError={handleAvatarError}
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
                  {postsLoading ? (
                    <div className="loading">Загрузка постов...</div>
                  ) : displayedPosts.length === 0 ? (
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
                                src={getAvatarUrl(post.authorAvatar)} 
                                alt={post.author}
                                onError={handleAvatarError}
                              />
                            </div>
                            <div className="post-author-info">
                              <span className="post-author-name">{post.author}</span>
                              <span className="post-time">{post.time}</span>
                              <span className="post-privacy-badge">{getPrivacyLabel(post.privacy)}</span>
                            </div>
                          </div>
                          
                          {/* Кнопка удаления для своих постов */}
                          {post.authorId === user.id && (
                            <button 
                              className="post-delete-btn"
                              onClick={() => handleDeletePost(post.id)}
                              title="Удалить пост"
                            >
                              Удалить
                            </button>
                          )}
                        </div>
                        
                        <div className="post-content">
                          <p>{post.content}</p>
                        </div>
                        
                        {/* Фотографии поста */}
                        {post.photos && post.photos.length > 0 && (
                          <div className="post-photos">
                            {post.photos.length === 1 ? (
                              <div className="single-photo">
                                <img 
                                  src={getImageUrl(post.photos[0])} 
                                  alt="Post" 
                                  onError={handleImageError}
                                />
                              </div>
                            ) : (
                              <div className="multiple-photos">
                                {post.photos.slice(0, 4).map((photo, index) => (
                                  <div key={index} className="photo-item">
                                    <img 
                                      src={getImageUrl(photo)} 
                                      alt={`Post ${index + 1}`}
                                      onError={handleImageError}
                                    />
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
                            <button 
                              className={`like-btn ${post.isLiked ? 'liked' : ''}`}
                              onClick={() => post.isLiked ? handleUnlikePost(post.id) : handleLikePost(post.id)}
                            >
                              {post.likes} {post.isLiked ? 'Нравится' : 'Нравится'}
                            </button>
                          </div>
                          <div className="post-stat">
                            <span className="comment-icon">{post.comments} Комментарии</span>
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
                            {userGame.hours_played > 0 && (
                              <span className="game-hours">{userGame.hours_played}ч</span>
                            )}
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
                                onError={handleAvatarError}
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
                <CreatePost
                  onClose={() => setShowCreatePostModal(false)}
                  onPostCreated={handlePostCreated}
                />
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
                          {userGame.hours_played > 0 && (
                            <span className="modal-game-hours">{userGame.hours_played}ч</span>
                          )}
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
                            onError={handleAvatarError}
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