import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI, partnersAPI, gamesAPI, postsAPI, donationsAPI } from '../services/api';
import type { UserProfile, Post as APIPost, FriendRequest, Comment } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError as handleAvatarError } from '../utils/avatar';
import { getImageUrl, handleImageError } from '../utils/image';
import CreatePost from '../components/CreatePost';
import Gallery from '../components/Gallery';
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
  avatar: string;
}

interface GalleryImage {
  id: number;
  post_id: number;
  image_url: string;
  created_at: string;
}

interface Post {
  id: number;
  author: string;
  authorId: string | number;
  authorAvatar?: string;
  content: string;
  likes: number;
  comments: number;
  commentsList?: Comment[];
  time: string;
  privacy: string;
  photos: string[];
  isLiked?: boolean;
  showComments?: boolean;
}

interface DonationTier {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  icon: string;
  color: string;
  benefits: string[];
}

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const [user, setUser] = useState<UserProfile | null>(null);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [showNotifications, setShowNotifications] = useState<boolean>(false);
  const [showGalleryModal, setShowGalleryModal] = useState<boolean>(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImage | null>(null);
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({});
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [showReplyForm, setShowReplyForm] = useState<{ [key: number]: boolean }>({});
  const [deletingComment, setDeletingComment] = useState<{ [key: number]: boolean }>({});
  const [showPostMenu, setShowPostMenu] = useState<{ [key: number]: boolean }>({});
  const [showCommentMenu, setShowCommentMenu] = useState<{ [key: number]: boolean }>({});
  
  // Состояния для модального окна удаления поста
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [postToDelete, setPostToDelete] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Состояния для просмотра фото из поста
  const [showPostPhotosModal, setShowPostPhotosModal] = useState<boolean>(false);
  const [selectedPostPhotos, setSelectedPostPhotos] = useState<string[]>([]);
  const [selectedPostPhotoIndex, setSelectedPostPhotoIndex] = useState<number>(0);
  
  // Состояния для донатов
  const [donationTiers, setDonationTiers] = useState<DonationTier[]>([]);
  const [showDonationSettings, setShowDonationSettings] = useState<boolean>(false);
  const [editingTier, setEditingTier] = useState<DonationTier | null>(null);
  const [savingTiers, setSavingTiers] = useState<boolean>(false);
  
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showMenu, setShowMenu] = useState<boolean>(false);
  const [showGamesModal, setShowGamesModal] = useState<boolean>(false);
  const [showFriendsModal, setShowFriendsModal] = useState<boolean>(false);
  const [showCreatePostModal, setShowCreatePostModal] = useState<boolean>(false);
  const [postsLoading, setPostsLoading] = useState<boolean>(false);
  const [galleryLoading, setGalleryLoading] = useState<boolean>(false);
  const [initialLoadDone, setInitialLoadDone] = useState<boolean>(false);
  
  const galleryLoadedRef = useRef<boolean>(false);

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
        const normalizedFriends = response.data.map(friend => ({
          id: friend.id,
          username: friend.username || '',
          first_name: friend.first_name || '',
          avatar: friend.avatar || '/static/default-avatar.png'
        }));
        setUserFriends(normalizedFriends);
      }
    } catch (error) {
      console.error('Ошибка загрузки друзей:', error);
    }
  }, [user]);

  const loadGallery = useCallback(async () => {
    if (galleryLoadedRef.current || galleryLoading) return;
    
    try {
      setGalleryLoading(true);
      if (user) {
        const userId = typeof user.id === 'string' ? user.id : String(user.id);
        const response = await postsAPI.getUserGallery(userId);
        setGalleryImages(response.data);
        galleryLoadedRef.current = true;
      }
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setGalleryLoading(false);
    }
  }, [user, galleryLoading]);

  const loadFriendRequests = useCallback(async () => {
    try {
      const response = await partnersAPI.getFriendRequests();
      setFriendRequests(response.data);
    } catch (error) {
      console.error('Ошибка загрузки запросов в друзья:', error);
    }
  }, []);

  const loadDonationTiers = useCallback(async () => {
    try {
      const response = await donationsAPI.getTiers();
      setDonationTiers(response.data);
    } catch (error) {
      console.error('Error loading donation tiers:', error);
    }
  }, []);

  const handleSaveTier = async () => {
    if (!editingTier) return;
    
    setSavingTiers(true);
    try {
      await donationsAPI.updateTier(editingTier.id, {
        name: editingTier.name,
        price: editingTier.price,
        duration_days: editingTier.duration_days
      });
      
      setDonationTiers(prev => prev.map(tier => 
        tier.id === editingTier.id ? editingTier : tier
      ));
      setEditingTier(null);
    } catch (error) {
      console.error('Error saving tier:', error);
      alert('Ошибка при сохранении');
    } finally {
      setSavingTiers(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await partnersAPI.acceptFriendRequest(requestId);
      await loadFriendRequests();
      if (user) {
        await loadUserFriends();
      }
    } catch (error) {
      console.error('Ошибка при принятии запроса:', error);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await partnersAPI.rejectFriendRequest(requestId);
      await loadFriendRequests();
    } catch (error) {
      console.error('Ошибка при отклонении запроса:', error);
    }
  };

  const loadUserPosts = useCallback(async (userId: string | number) => {
    try {
      setPostsLoading(true);
      const id = typeof userId === 'string' ? userId : String(userId);
      const response = await postsAPI.getUserPosts(id);
      
      const formattedPosts: Post[] = response.data.posts.map((post: APIPost) => ({
        id: post.id,
        author: post.author.username,
        authorId: post.author.id,
        authorAvatar: post.author.avatar,
        content: post.content,
        likes: post.likes_count || 0,
        comments: post.comments_count || 0,
        commentsList: [],
        time: new Date(post.created_at).toLocaleString(),
        privacy: post.privacy,
        photos: post.images.map(img => img.image_url),
        isLiked: post.is_liked,
        showComments: false
      }));
      
      setUserPosts(formattedPosts);
    } catch (error) {
      console.error('Ошибка загрузки постов:', error);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadComments = async (postId: number) => {
    try {
      setLoadingComments(prev => ({ ...prev, [postId]: true }));
      const response = await postsAPI.getPost(postId);
      const comments = response.data.comments || [];
      
      setUserPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, commentsList: comments, showComments: true }
          : post
      ));
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: number) => {
    setUserPosts(prev => prev.map(post => {
      if (post.id === postId) {
        if (!post.commentsList || post.commentsList.length === 0) {
          loadComments(postId);
          return { ...post, showComments: true };
        }
        return { ...post, showComments: !post.showComments };
      }
      return post;
    }));
  };

  const handleAddComment = async (postId: number) => {
    const commentText = newComment[postId];
    if (!commentText || !commentText.trim()) return;
    
    try {
      const response = await postsAPI.addComment(postId, commentText);
      const newCommentData = response.data;
      
      setUserPosts(prev => prev.map(post => 
        post.id === postId 
          ? { 
              ...post, 
              comments: post.comments + 1,
              commentsList: [...(post.commentsList || []), newCommentData]
            }
          : post
      ));
      
      setNewComment(prev => ({ ...prev, [postId]: '' }));
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: number, postId: number) => {
    setDeletingComment(prev => ({ ...prev, [commentId]: true }));
    
    try {
      await postsAPI.deleteComment(commentId);
      
      setUserPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        
        const removeCommentRecursive = (comments: Comment[]): Comment[] => {
          return comments.filter(comment => {
            if (comment.id === commentId) return false;
            if (comment.replies && comment.replies.length > 0) {
              comment.replies = removeCommentRecursive(comment.replies);
            }
            return true;
          });
        };
        
        const newCommentsList = removeCommentRecursive(post.commentsList || []);
        
        return {
          ...post,
          comments: post.comments - 1,
          commentsList: newCommentsList
        };
      }));
      
    } catch (error) {
      console.error('Error deleting comment:', error);
    } finally {
      setDeletingComment(prev => ({ ...prev, [commentId]: false }));
    }
  };

  const handleReplySubmit = async (postId: number, parentId: number) => {
    const text = replyText[parentId];
    if (!text || !text.trim()) return;
    
    try {
      const response = await postsAPI.addComment(postId, text, parentId);
      const newReplyData = response.data;
      
      setUserPosts(prev => prev.map(post => {
        if (post.id !== postId) return post;
        
        const updateCommentsList = (comments: Comment[]): Comment[] => {
          return comments.map(comment => {
            if (comment.id === parentId) {
              return {
                ...comment,
                replies: [...(comment.replies || []), newReplyData]
              };
            }
            if (comment.replies && comment.replies.length > 0) {
              return {
                ...comment,
                replies: updateCommentsList(comment.replies)
              };
            }
            return comment;
          });
        };
        
        return {
          ...post,
          comments: post.comments + 1,
          commentsList: updateCommentsList(post.commentsList || [])
        };
      }));
      
      setReplyText(prev => ({ ...prev, [parentId]: '' }));
      setShowReplyForm(prev => ({ ...prev, [parentId]: false }));
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  // Функции для удаления поста с модальным окном
  const handleDeletePost = (postId: number) => {
    setPostToDelete(postId);
    setShowDeleteModal(true);
    setShowPostMenu(prev => ({ ...prev, [postId]: false }));
  };

  const confirmDeletePost = async () => {
    if (!postToDelete) return;
    
    try {
      setIsDeleting(true);
      await postsAPI.deletePost(postToDelete);
      setUserPosts(prev => prev.filter(post => post.id !== postToDelete));
      galleryLoadedRef.current = false;
      setTimeout(() => loadGallery(), 500);
      setShowDeleteModal(false);
      setPostToDelete(null);
    } catch (error) {
      console.error('Error deleting post:', error);
      alert('Ошибка при удалении поста');
    } finally {
      setIsDeleting(false);
    }
  };

  const cancelDeletePost = () => {
    setShowDeleteModal(false);
    setPostToDelete(null);
  };

  // Функции для просмотра фото из поста
  const openPostPhotosModal = (photos: string[], index: number = 0) => {
    setSelectedPostPhotos(photos);
    setSelectedPostPhotoIndex(index);
    setShowPostPhotosModal(true);
  };

  const closePostPhotosModal = () => {
    setShowPostPhotosModal(false);
    setSelectedPostPhotos([]);
    setSelectedPostPhotoIndex(0);
  };

  const nextPhoto = () => {
    if (selectedPostPhotoIndex < selectedPostPhotos.length - 1) {
      setSelectedPostPhotoIndex(selectedPostPhotoIndex + 1);
    }
  };

  const prevPhoto = () => {
    if (selectedPostPhotoIndex > 0) {
      setSelectedPostPhotoIndex(selectedPostPhotoIndex - 1);
    }
  };

  const renderComment = (comment: Comment, postId: number, depth: number = 0) => {
    const maxDepth = 5;
    const isAuthor = user && comment.author_id === user.id;
    const isDeleting = deletingComment[comment.id];
    
    return (
      <div key={comment.id} className={`comment-item depth-${Math.min(depth, maxDepth)}`}>
        <img 
          src={getAvatarUrl(comment.author?.avatar)} 
          alt={comment.author?.username}
          className="comment-avatar"
          onError={handleAvatarError}
        />
        <div className="comment-content">
          <div className="comment-header">
            <div className="comment-author">
              {comment.author?.first_name || comment.author?.username}
            </div>
            {isAuthor && (
              <div className="comment-actions">
                <button 
                  className="comment-menu-btn"
                  onClick={() => setShowCommentMenu(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                >
                  ⋮
                </button>
                {showCommentMenu[comment.id] && (
                  <div className="comment-menu-dropdown">
                    <button 
                      className="comment-menu-item delete"
                      onClick={() => {
                        handleDeleteComment(comment.id, postId);
                        setShowCommentMenu(prev => ({ ...prev, [comment.id]: false }));
                      }}
                      disabled={isDeleting}
                    >
                      {isDeleting ? '...' : 'Удалить'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="comment-text">{comment.content}</div>
          <div className="comment-time">
            {new Date(comment.created_at).toLocaleString()}
          </div>
          <button 
            className="comment-reply-btn"
            onClick={() => setShowReplyForm(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
          >
            Ответить
          </button>
          
          {showReplyForm[comment.id] && (
            <div className="reply-form">
              <input
                type="text"
                placeholder={`Ответить ${comment.author?.first_name || ''}...`}
                value={replyText[comment.id] || ''}
                onChange={(e) => setReplyText(prev => ({ ...prev, [comment.id]: e.target.value }))}
                onKeyPress={(e) => e.key === 'Enter' && handleReplySubmit(postId, comment.id)}
                className="reply-input"
              />
              <button 
                onClick={() => handleReplySubmit(postId, comment.id)}
                className="reply-submit-btn"
                disabled={!replyText[comment.id]?.trim()}
              >
                Отправить
              </button>
            </div>
          )}
          
          {comment.replies && comment.replies.length > 0 && (
            <div className="comment-replies">
              {comment.replies.map(reply => renderComment(reply, postId, depth + 1))}
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setIsLoading(true);
        
        const response = await authAPI.getProfile();
        setUser(response.data);
        localStorage.setItem('user', JSON.stringify(response.data));
        setError('');
        
        await Promise.all([
          loadUserGames(),
          loadFriendRequests(),
          loadDonationTiers()
        ]);
        
        setInitialLoadDone(true);
      } catch (error: any) {
        console.error('Ошибка загрузки профиля:', error);
        
        if (error.response?.status === 401) {
          setError('Сессия истекла. Войдите снова.');
          localStorage.clear();
          navigate('/login');
        } else {
          setError('Ошибка загрузки профиля');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProfile();
  }, [navigate, loadUserGames, loadFriendRequests, loadDonationTiers]);

  useEffect(() => {
    if (user && initialLoadDone) {
      loadUserPosts(user.id);
      loadUserFriends();
    }
  }, [user, initialLoadDone, loadUserPosts, loadUserFriends]);

  useEffect(() => {
    if (user && initialLoadDone && userPosts.length > 0 && !galleryLoadedRef.current) {
      const timer = setTimeout(() => {
        loadGallery();
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [user, initialLoadDone, userPosts.length, loadGallery]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    navigate('/edit-profile');
    setShowMenu(false);
  };

  const handlePostCreated = () => {
    if (user) {
      loadUserPosts(user.id);
      galleryLoadedRef.current = false;
      setTimeout(() => loadGallery(), 500);
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

  const displayedGames = userGames.slice(0, 3);
  const displayedFriends = userFriends.slice(0, 3);
  const displayedPosts = userPosts;
  const displayedGallery = galleryImages.slice(0, 6);

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
      case 'friends': return 'Только друзья';
      case 'donators': return 'Для донатеров';
      default: return 'Публичный';
    }
  };

  const getRussianName = (tierName: string): string => {
    switch (tierName) {
      case 'Support':
        return 'Поддержка';
      case 'VIP':
        return 'VIP';
      case 'Premium':
        return 'Премиум';
      default:
        return tierName;
    }
  };

  if (isLoading && !user) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <h3>Загрузка профиля...</h3>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="error-container">
            <h3>Ошибка</h3>
            <p>{error}</p>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => navigate('/login')}>Перейти ко входу</button>
              <button className="btn btn-secondary" onClick={() => window.location.reload()}>Обновить страницу</button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="empty-container">
            <h3>Данные пользователя не найдены</h3>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={() => window.location.reload()}>Обновить страницу</button>
              <button className="btn btn-secondary" onClick={() => navigate('/login')}>Войти</button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="profile-container">
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
              
              <div className="profile-menu-container">
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
                          friendRequests.map(request => {
                            const sender = request.user;
                            if (!sender) return null;
                            
                            return (
                              <div key={request.id} className="notification-item">
                                <img 
                                  src={getAvatarUrl(sender.avatar)} 
                                  alt={sender.username}
                                  className="notification-avatar"
                                  onError={handleAvatarError}
                                />
                                <div className="notification-content">
                                  <p>
                                    <strong>{sender.first_name}</strong>
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
                            );
                          })
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
                    <button className="dropdown-item" onClick={() => setShowDonationSettings(true)}>
                      Настройка донатов
                    </button>
                    <button className="dropdown-item" onClick={handleLogout}>
                      Выйти
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="profile-main-layout">
            <div className="posts-column">
              {galleryImages.length > 0 && !galleryLoading && (
                <div className="gallery-preview">
                  <div className="gallery-preview-header">
                    <h3>Мои фото</h3>
                    {galleryImages.length > 6 && (
                      <button 
                        className="gallery-preview-all"
                        onClick={() => setShowGalleryModal(true)}
                      >
                        Все фото ({galleryImages.length})
                      </button>
                    )}
                  </div>
                  <div className="gallery-preview-grid">
                    {displayedGallery.map((image, index) => (
                      <div 
                        key={image.id} 
                        className="gallery-preview-item"
                        onClick={() => setSelectedFullImage(image)}
                      >
                        <img 
                          src={getImageUrl(image.image_url)} 
                          alt={`Фото ${index + 1}`}
                          onError={handleImageError}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
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
              
              {postsLoading && displayedPosts.length === 0 ? (
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
                      
                      {post.authorId === user.id && (
                        <div className="post-actions">
                          <button 
                            className="post-menu-btn"
                            onClick={() => setShowPostMenu(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                          >
                            ⋮
                          </button>
                          {showPostMenu[post.id] && (
                            <div className="post-menu-dropdown">
                              <button 
                                className="post-menu-item delete"
                                onClick={() => handleDeletePost(post.id)}
                              >
                                Удалить пост
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    
                    <div className="post-content">
                      <p>{post.content}</p>
                    </div>
                    
                    {post.photos && post.photos.length > 0 && (
                      <div className="post-photos">
                        {post.photos.length === 1 ? (
                          <div className="single-photo">
                            <img 
                              src={getImageUrl(post.photos[0])} 
                              alt="Post" 
                              onError={handleImageError}
                              onClick={() => openPostPhotosModal(post.photos, 0)}
                              style={{ cursor: 'pointer' }}
                            />
                          </div>
                        ) : (
                          <div className="multiple-photos">
                            {post.photos.slice(0, 4).map((photo, index) => (
                              <div 
                                key={index} 
                                className="photo-item"
                                onClick={() => openPostPhotosModal(post.photos, index)}
                                style={{ cursor: 'pointer' }}
                              >
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
                      <button 
                        className={`like-btn ${post.isLiked ? 'liked' : ''}`}
                        onClick={() => post.isLiked ? handleUnlikePost(post.id) : handleLikePost(post.id)}
                      >
                        {post.likes} Нравится
                      </button>
                      <button 
                        className="comments-toggle-btn"
                        onClick={() => toggleComments(post.id)}
                      >
                        {post.comments} Комментарии
                      </button>
                    </div>
                    
                    {post.showComments && (
                      <div className="post-comments-section">
                        <div className="comments-list">
                          {loadingComments[post.id] ? (
                            <div className="comments-loading">Загрузка комментариев...</div>
                          ) : (
                            <>
                              {post.commentsList && post.commentsList.length > 0 ? (
                                post.commentsList.map(comment => renderComment(comment, post.id, 0))
                              ) : (
                                <div className="no-comments">Нет комментариев. Будьте первым!</div>
                              )}
                              
                              <div className="add-comment">
                                <input
                                  type="text"
                                  placeholder="Написать комментарий..."
                                  value={newComment[post.id] || ''}
                                  onChange={(e) => setNewComment(prev => ({ ...prev, [post.id]: e.target.value }))}
                                  onKeyPress={(e) => e.key === 'Enter' && handleAddComment(post.id)}
                                  className="comment-input"
                                />
                                <button 
                                  onClick={() => handleAddComment(post.id)}
                                  className="comment-submit-btn"
                                  disabled={!newComment[post.id]?.trim()}
                                >
                                  Отправить
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            
            <div className="sidebar-column">
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
                      <Link to={`/partner/${friend.id}`} key={friend.id} className="friend-mini-item">
                        <div className="friend-mini-avatar">
                          <img 
                            src={getAvatarUrl(friend.avatar)} 
                            alt={friend.username}
                            onError={handleAvatarError}
                          />
                        </div>
                        <span className="friend-mini-name">{friend.first_name}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Блок уровней поддержки */}
              {donationTiers.length > 0 && (
                <div className="sidebar-card">
                  <div className="sidebar-card-header">
                    <h3 className="sidebar-card-title">Уровни поддержки</h3>
                    <button 
                      className="sidebar-show-all"
                      onClick={() => setShowDonationSettings(true)}
                    >
                      Настроить
                    </button>
                  </div>
                  <div className="donation-tiers-mini">
                    {donationTiers.map((tier: DonationTier) => (
                      <div key={tier.id} className="donation-tier-mini-item">
                        <div className="donation-tier-mini-icon" style={{ background: tier.color }}>
                          {tier.icon}
                        </div>
                        <div className="donation-tier-mini-info">
                          <div className="donation-tier-mini-name">{getRussianName(tier.name)}</div>
                          <div className="donation-tier-mini-price">{tier.price} ₽</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
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
                    <span className="modal-game-hours">{userGame.hours_played} ч</span>
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
                <Link to={`/partner/${friend.id}`} key={friend.id} className="modal-friend-item">
                  <img 
                    src={getAvatarUrl(friend.avatar)} 
                    alt={friend.username}
                    className="modal-friend-avatar"
                    onError={handleAvatarError}
                  />
                  <div className="modal-friend-info">
                    <div className="modal-friend-name">{friend.first_name}</div>
                    <p className="modal-friend-username">@{friend.username}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка галереи */}
      {showGalleryModal && (
        <Gallery 
          images={galleryImages} 
          onClose={() => setShowGalleryModal(false)} 
        />
      )}
      
      {/* Модалка настроек донатов */}
      {showDonationSettings && (
        <div className="modal-overlay" onClick={() => setShowDonationSettings(false)}>
          <div className="modal-content donation-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Настройка уровней поддержки</h2>
              <button 
                className="modal-close"
                onClick={() => setShowDonationSettings(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="donation-settings-body">
              <div className="donation-tiers-editor">
                {donationTiers.map(tier => (
                  <div key={tier.id} className="donation-tier-edit-card">
                    {editingTier?.id === tier.id ? (
                      <div className="tier-edit-form">
                        <div className="tier-edit-field">
                          <label>Название</label>
                          <input
                            type="text"
                            value={editingTier.name}
                            onChange={(e) => setEditingTier({ ...editingTier, name: e.target.value })}
                          />
                        </div>
                        <div className="tier-edit-field">
                          <label>Цена (₽)</label>
                          <input
                            type="number"
                            value={editingTier.price}
                            onChange={(e) => setEditingTier({ ...editingTier, price: Number(e.target.value) })}
                            min={10}
                            step={10}
                          />
                        </div>
                        <div className="tier-edit-field">
                          <label>Длительность (дней)</label>
                          <input
                            type="number"
                            value={editingTier.duration_days}
                            onChange={(e) => setEditingTier({ ...editingTier, duration_days: Number(e.target.value) })}
                            min={1}
                          />
                        </div>
                        <div className="tier-edit-actions">
                          <button className="btn btn-primary btn-sm" onClick={handleSaveTier} disabled={savingTiers}>
                            {savingTiers ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingTier(null)}>
                            Отмена
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="tier-view-info">
                        <div className="tier-icon" style={{ background: tier.color }}>{tier.icon}</div>
                        <div className="tier-info">
                          <div className="tier-name">{getRussianName(tier.name)}</div>
                          <div className="tier-price">{tier.price} ₽ / {tier.duration_days} дней</div>
                        </div>
                        <button 
                          className="tier-edit-btn"
                          onClick={() => setEditingTier({ ...tier })}
                        >
                          ✎ Редактировать
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка для просмотра всех фото поста */}
      {showPostPhotosModal && (
        <div className="modal-overlay" onClick={closePostPhotosModal}>
          <div className="modal-content post-photos-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">
                Все фото ({selectedPostPhotos.length})
              </h2>
              <button 
                className="modal-close"
                onClick={closePostPhotosModal}
              >
                ✕
              </button>
            </div>
            <div className="post-photos-modal-grid">
              {selectedPostPhotos.map((photo, index) => (
                <div 
                  key={index} 
                  className="post-photos-modal-item"
                  onClick={() => {
                    setSelectedPostPhotoIndex(index);
                    setSelectedFullImage({ id: index, post_id: 0, image_url: photo, created_at: '' });
                    setShowPostPhotosModal(false);
                  }}
                >
                  <img 
                    src={getImageUrl(photo)} 
                    alt={`Фото ${index + 1}`}
                    onError={handleImageError}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Полноэкранный просмотр фото из поста */}
      {selectedFullImage && !showPostPhotosModal && (
        <div className="post-fullscreen-modal" onClick={() => setSelectedFullImage(null)}>
          <button 
            className="post-fullscreen-close"
            onClick={() => setSelectedFullImage(null)}
          >
            ✕
          </button>
          {selectedPostPhotos.length > 1 && (
            <>
              {selectedPostPhotoIndex > 0 && (
                <button 
                  className="post-fullscreen-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevPhoto();
                  }}
                >
                  ‹
                </button>
              )}
              {selectedPostPhotoIndex < selectedPostPhotos.length - 1 && (
                <button 
                  className="post-fullscreen-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextPhoto();
                  }}
                >
                  ›
                </button>
              )}
            </>
          )}
          <img 
            src={getImageUrl(selectedPostPhotos[selectedPostPhotoIndex] || selectedFullImage.image_url)} 
            alt="Full size"
            onClick={(e) => e.stopPropagation()}
            onError={handleImageError}
          />
          {selectedPostPhotos.length > 1 && (
            <div className="post-fullscreen-counter">
              {selectedPostPhotoIndex + 1} / {selectedPostPhotos.length}
            </div>
          )}
        </div>
      )}
      
      {/* Модальное окно подтверждения удаления поста */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={cancelDeletePost}>
          <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Удаление поста</h2>
              <button 
                className="modal-close"
                onClick={cancelDeletePost}
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p>Вы уверены, что хотите удалить этот пост?</p>
              <p className="delete-warning">Это действие нельзя отменить.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={cancelDeletePost}
                disabled={isDeleting}
              >
                Отмена
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDeletePost}
                disabled={isDeleting}
              >
                {isDeleting ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      <Footer />
    </div>
  );
};

export default Profile;