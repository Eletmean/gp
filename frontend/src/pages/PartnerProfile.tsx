import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { partnersAPI, postsAPI, gamesAPI, donationsAPI } from '../services/api';
import type { Post as APIPost, Comment, PartnerProfile as PartnerProfileType, Friend, UserGame } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../utils/avatar';
import { getImageUrl, handleImageError as handleImageErrorUtil } from '../utils/image';
import AuthModal from '../components/AuthModal';
import DonationModal from '../components/DonationModal';
import '../styles/PartnerProfile.css';

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

interface GalleryImage {
  id: number;
  post_id: number;
  image_url: string;
  created_at: string;
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

const PartnerProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [profile, setProfile] = useState<PartnerProfileType | null>(null);
  const [userPosts, setUserPosts] = useState<Post[]>([]);
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [userFriends, setUserFriends] = useState<Friend[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [donationTiers, setDonationTiers] = useState<DonationTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [friendsLoading, setFriendsLoading] = useState(false);
  const [gamesLoading, setGamesLoading] = useState(false);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [newComment, setNewComment] = useState<{ [key: number]: string }>({});
  const [loadingComments, setLoadingComments] = useState<{ [key: number]: boolean }>({});
  const [replyText, setReplyText] = useState<{ [key: number]: string }>({});
  const [showReplyForm, setShowReplyForm] = useState<{ [key: number]: boolean }>({});
  const [deletingComment, setDeletingComment] = useState<{ [key: number]: boolean }>({});
  const [showPostMenu, setShowPostMenu] = useState<{ [key: number]: boolean }>({});
  const [showCommentMenu, setShowCommentMenu] = useState<{ [key: number]: boolean }>({});
  const [showGamesModal, setShowGamesModal] = useState(false);
  const [showFriendsModal, setShowFriendsModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [selectedFullImage, setSelectedFullImage] = useState<GalleryImage | null>(null);
  const [showDonationModal, setShowDonationModal] = useState(false);
  
  // Состояния для просмотра фото из поста
  const [showPostPhotosModal, setShowPostPhotosModal] = useState<boolean>(false);
  const [selectedPostPhotos, setSelectedPostPhotos] = useState<string[]>([]);
  const [selectedPostPhotoIndex, setSelectedPostPhotoIndex] = useState<number>(0);
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMessage, setAuthModalMessage] = useState('');
  const [authModalTitle, setAuthModalTitle] = useState('');

  const showAuthRequiredModal = (action: string) => {
    setAuthModalTitle('Требуется авторизация');
    setAuthModalMessage(`Чтобы ${action}, необходимо войти в систему`);
    setShowAuthModal(true);
  };

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await partnersAPI.getById(id!);
      setProfile(response.data);
    } catch (error: any) {
      console.error('Error loading partner profile:', error);
      setError(error.response?.data?.detail || 'Не удалось загрузить профиль');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadUserGames = useCallback(async () => {
    try {
      setGamesLoading(true);
      const response = await gamesAPI.getUserGamesById(id!);
      setUserGames(response.data);
    } catch (error) {
      console.error('Error loading user games:', error);
      setUserGames([]);
    } finally {
      setGamesLoading(false);
    }
  }, [id]);

  const loadUserFriends = useCallback(async () => {
    try {
      setFriendsLoading(true);
      const response = await partnersAPI.getUserFriends(id!);
      setUserFriends(response.data);
    } catch (error) {
      console.error('Error loading user friends:', error);
      setUserFriends([]);
    } finally {
      setFriendsLoading(false);
    }
  }, [id]);

  const loadUserPosts = useCallback(async (userId: string) => {
    try {
      setPostsLoading(true);
      const response = await postsAPI.getUserPosts(userId);
      
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
      console.error('Error loading user posts:', error);
      setUserPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, []);

  const loadGallery = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      setGalleryLoading(true);
      const response = await postsAPI.getUserGallery(id!);
      setGalleryImages(response.data);
    } catch (error) {
      console.error('Error loading gallery:', error);
    } finally {
      setGalleryLoading(false);
    }
  }, [id, isAuthenticated]);

  const loadDonationTiers = useCallback(async () => {
    try {
      const response = await donationsAPI.getTiers();
      setDonationTiers(response.data);
    } catch (error) {
      console.error('Error loading donation tiers:', error);
    }
  }, []);

  const loadComments = async (postId: number) => {
    if (!isAuthenticated) {
      showAuthRequiredModal('просматривать комментарии');
      return;
    }
    
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
      setUserPosts(prev => prev.map(post => 
        post.id === postId 
          ? { ...post, showComments: false }
          : post
      ));
    } finally {
      setLoadingComments(prev => ({ ...prev, [postId]: false }));
    }
  };

  const toggleComments = (postId: number) => {
    if (!isAuthenticated) {
      showAuthRequiredModal('просматривать и писать комментарии');
      return;
    }
    
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
    if (!isAuthenticated) {
      showAuthRequiredModal('написать комментарий');
      return;
    }
    
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
    if (!isAuthenticated) {
      showAuthRequiredModal('удалить комментарий');
      return;
    }
    
    setDeletingComment(prev => ({ ...prev, [commentId]: true }));
    setShowCommentMenu(prev => ({ ...prev, [commentId]: false }));
    
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
    if (!isAuthenticated) {
      showAuthRequiredModal('ответить на комментарий');
      return;
    }
    
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

  const handleLikePost = async (postId: number) => {
    if (!isAuthenticated) {
      showAuthRequiredModal('поставить лайк');
      return;
    }
    
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
    if (!isAuthenticated) {
      showAuthRequiredModal('убрать лайк');
      return;
    }
    
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
    if (!isAuthenticated) {
      showAuthRequiredModal('удалить пост');
      return;
    }
    
    setShowPostMenu(prev => ({ ...prev, [postId]: false }));
    
    if (!window.confirm('Вы уверены, что хотите удалить этот пост?')) {
      return;
    }
    
    try {
      await postsAPI.deletePost(postId);
      setUserPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  const handleSendFriendRequest = async () => {
    if (!isAuthenticated) {
      showAuthRequiredModal('добавить в друзья');
      return;
    }

    if (!profile) return;

    setSendingRequest(true);
    try {
      await partnersAPI.sendFriendRequest(id!);
      setProfile({
        ...profile,
        friendship_status: 'pending'
      });
    } catch (err: any) {
      console.error('Error sending friend request:', err);
      alert(err.response?.data?.detail || 'Ошибка при отправке запроса');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!isAuthenticated) {
      showAuthRequiredModal('удалить из друзей');
      return;
    }

    if (!profile) return;

    setSendingRequest(true);
    try {
      await partnersAPI.removeFriend(id!);
      setProfile({
        ...profile,
        is_friend: false,
        friendship_status: null
      });
    } catch (err: any) {
      console.error('Error removing friend:', err);
      alert(err.response?.data?.detail || 'Ошибка при удалении из друзей');
    } finally {
      setSendingRequest(false);
    }
  };

  const handleDonationSuccess = () => {
    if (id) {
      loadUserPosts(id);
      if (isAuthenticated) {
        loadGallery();
      }
    }
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

  const handleImageClick = (image: GalleryImage) => {
    setSelectedFullImage(image);
  };

  const renderActionButton = () => {
    if (!isAuthenticated) {
      return (
        <button 
          className="friend-action-btn"
          onClick={() => showAuthRequiredModal('добавить в друзья')}
        >
          Войдите чтобы добавить
        </button>
      );
    }

    if (profile?.is_friend) {
      return (
        <button 
          className="friend-action-btn friend-remove"
          onClick={handleRemoveFriend}
          disabled={sendingRequest}
        >
          {sendingRequest ? '...' : 'Удалить из друзей'}
        </button>
      );
    }

    if (profile?.friendship_status === 'pending') {
      return (
        <button className="friend-action-btn friend-pending" disabled>
          Запрос отправлен
        </button>
      );
    }

    return (
      <button 
        className="friend-action-btn"
        onClick={handleSendFriendRequest}
        disabled={sendingRequest}
      >
        {sendingRequest ? '...' : 'Добавить в друзья'}
      </button>
    );
  };

  const renderComment = (comment: Comment, postId: number, depth: number = 0) => {
    const maxDepth = 5;
    const isAuthor = currentUser && comment.author_id === currentUser.id;
    
    return (
      <div key={comment.id} className={`comment-item depth-${Math.min(depth, maxDepth)}`}>
        <img 
          src={getAvatarUrl(comment.author?.avatar)} 
          alt={comment.author?.username}
          className="comment-avatar"
          onError={handleImageError}
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
                      onClick={() => handleDeleteComment(comment.id, postId)}
                      disabled={deletingComment[comment.id]}
                    >
                      {deletingComment[comment.id] ? '...' : 'Удалить'}
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

  useEffect(() => {
    if (id) {
      loadProfile();
      loadUserPosts(id);
      loadUserFriends();
      loadUserGames();
      loadGallery();
      loadDonationTiers();
    }
  }, [id, loadProfile, loadUserPosts, loadUserFriends, loadUserGames, loadGallery, loadDonationTiers]);

  if (loading) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка профиля...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="page-wrapper">
        <Header />
        <main className="main-content">
          <div className="error-container">
            <p className="error-message">{error || 'Профиль не найден'}</p>
            <Link to="/" className="btn btn-primary">Вернуться на главную</Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const displayedGames = userGames.slice(0, 3);
  const displayedFriends = userFriends.slice(0, 3);
  const displayedPosts = userPosts;
  const displayedGallery = galleryImages.slice(0, 6);

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
                    src={getAvatarUrl(profile.user.avatar)} 
                    alt="Avatar" 
                    className="profile-avatar-img"
                    onError={handleImageError}
                  />
                </div>
                
                <div className="profile-text-info">
                  <h1 className="profile-username-large">{profile.user.first_name}</h1>
                  <p className="profile-bio">{profile.user.bio || 'Пользователь не добавил информацию о себе'}</p>
                  
                  {profile.user.favorite_game && (
                    <div className="profile-favorite-game">
                      <span className="favorite-game-label">Любимая игра:</span>
                      <span className="favorite-game-name">{profile.user.favorite_game}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="profile-menu-container">
                <div className="friend-action-container">
                  {renderActionButton()}
                </div>
                <button 
                  className="donation-btn"
                  onClick={() => setShowDonationModal(true)}
                >
                  Поддержать
                </button>
              </div>
            </div>
          </div>
          
          <div className="profile-main-layout">
            {/* Левая колонка - Посты и Галерея */}
            <div className="posts-column">
              {/* Галерея */}
              {galleryImages.length > 0 && !galleryLoading && isAuthenticated && (
                <div className="gallery-preview">
                  <div className="gallery-preview-header">
                    <h3>Фото</h3>
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
                        onClick={() => handleImageClick(image)}
                      >
                        <img 
                          src={getImageUrl(image.image_url)} 
                          alt={`Фото ${index + 1}`}
                          onError={handleImageErrorUtil}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Посты */}
              {postsLoading && displayedPosts.length === 0 ? (
                <div className="loading">Загрузка постов...</div>
              ) : displayedPosts.length === 0 ? (
                <div className="empty-posts">
                  <p>У пользователя пока нет постов</p>
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
                            onError={handleImageError}
                          />
                        </div>
                        <div className="post-author-info">
                          <span className="post-author-name">{post.author}</span>
                          <span className="post-time">{post.time}</span>
                          <span className="post-privacy-badge">{getPrivacyLabel(post.privacy)}</span>
                        </div>
                      </div>
                      
                      {post.authorId === currentUser?.id && (
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
                              onError={handleImageErrorUtil}
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
                                  onError={handleImageErrorUtil}
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
                          onClick={() => {
                            if (!isAuthenticated) {
                              showAuthRequiredModal('поставить лайк');
                              return;
                            }
                            post.isLiked ? handleUnlikePost(post.id) : handleLikePost(post.id);
                          }}
                        >
                          {post.likes} {post.isLiked ? 'Нравится' : 'Нравится'}
                        </button>
                      </div>
                      <div className="post-stat">
                        <button 
                          className="comments-toggle-btn"
                          onClick={() => {
                            if (!isAuthenticated) {
                              showAuthRequiredModal('просматривать и писать комментарии');
                              return;
                            }
                            toggleComments(post.id);
                          }}
                        >
                          {post.comments} Комментарии
                        </button>
                      </div>
                    </div>
                    
                    {post.showComments && isAuthenticated && (
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
            
            {/* Правая колонка - Игры и Друзья */}
            <div className="sidebar-column">
              {/* Блок игр */}
              <div className="sidebar-card">
                <div className="sidebar-card-header" onClick={() => setShowGamesModal(true)} style={{ cursor: 'pointer' }}>
                  <h3 className="sidebar-card-title">Игры</h3>
                  {userGames.length > 0 && (
                    <span className="sidebar-count">{userGames.length}</span>
                  )}
                </div>
                
                {gamesLoading ? (
                  <div className="loading-small">Загрузка игр...</div>
                ) : displayedGames.length === 0 ? (
                  <p className="empty-placeholder">Нет добавленных игр</p>
                ) : (
                  <>
                    <div className="games-list">
                      {displayedGames.map((userGame) => (
                        <div key={userGame.id} className="game-item">
                          <span className="game-name">{userGame.game?.name}</span>
                          {userGame.hours_played > 0 && (
                            <span className="game-hours">{userGame.hours_played}ч</span>
                          )}
                        </div>
                      ))}
                    </div>
                    {userGames.length > 3 && (
                      <div className="more-items" onClick={() => setShowGamesModal(true)}>
                        + еще {userGames.length - 3}
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {/* Блок друзей */}
              <div className="sidebar-card">
                <div className="sidebar-card-header" onClick={() => setShowFriendsModal(true)} style={{ cursor: 'pointer' }}>
                  <h3 className="sidebar-card-title">Друзья</h3>
                  {userFriends.length > 0 && (
                    <span className="sidebar-count">{userFriends.length}</span>
                  )}
                </div>
                
                {friendsLoading ? (
                  <div className="loading-small">Загрузка...</div>
                ) : displayedFriends.length === 0 ? (
                  <p className="empty-placeholder">Нет друзей</p>
                ) : (
                  <>
                    <div className="friends-mini-list">
                      {displayedFriends.map((friend) => {
                        const isCurrentUser = currentUser && friend.id === currentUser.id;
                        const linkTo = isCurrentUser ? '/profile' : `/partner/${friend.id}`;
                        
                        return (
                          <Link to={linkTo} key={friend.id} className="friend-mini-item">
                            <div className="friend-mini-avatar">
                              <img 
                                src={getAvatarUrl(friend.avatar)} 
                                alt={friend.username}
                                onError={handleImageError}
                              />
                            </div>
                            <span className="friend-mini-name">{friend.first_name}</span>
                          </Link>
                        );
                      })}
                    </div>
                    {userFriends.length > 3 && (
                      <div className="more-items" onClick={() => setShowFriendsModal(true)}>
                        + еще {userFriends.length - 3}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Блок уровней поддержки */}
              {donationTiers.length > 0 && (
                <div className="sidebar-card">
                  <div className="sidebar-card-header">
                    <h3 className="sidebar-card-title">Уровни поддержки</h3>
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
      
      {/* Модалка игр */}
      {showGamesModal && (
        <div className="modal-overlay" onClick={() => setShowGamesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Игры</h2>
              <button className="modal-close" onClick={() => setShowGamesModal(false)}>✕</button>
            </div>
            <div className="modal-list">
              {userGames.length === 0 ? (
                <p className="modal-empty">Нет добавленных игр</p>
              ) : (
                userGames.map((game) => (
                  <div key={game.id} className="modal-list-item">
                    <span className="modal-list-name">{game.game?.name}</span>
                    {game.hours_played > 0 && (
                      <span className="modal-list-hours">{game.hours_played}ч</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка друзей */}
      {showFriendsModal && (
        <div className="modal-overlay" onClick={() => setShowFriendsModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Друзья</h2>
              <button className="modal-close" onClick={() => setShowFriendsModal(false)}>✕</button>
            </div>
            <div className="modal-list">
              {userFriends.length === 0 ? (
                <p className="modal-empty">Нет друзей</p>
              ) : (
                userFriends.map((friend) => {
                  const isCurrentUser = currentUser && friend.id === currentUser.id;
                  const linkTo = isCurrentUser ? '/profile' : `/partner/${friend.id}`;
                  return (
                    <Link to={linkTo} key={friend.id} className="modal-list-item" onClick={() => setShowFriendsModal(false)}>
                      <img 
                        src={getAvatarUrl(friend.avatar)} 
                        alt={friend.username}
                        className="modal-list-avatar"
                        onError={handleImageError}
                      />
                      <div className="modal-list-info">
                        <div className="modal-list-name">{friend.first_name}</div>
                        <div className="modal-list-username">@{friend.username}</div>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Модалка галереи */}
      {showGalleryModal && isAuthenticated && (
        <div className="modal-overlay" onClick={() => setShowGalleryModal(false)}>
          <div className="modal-content gallery-modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Все фото</h2>
              <button className="modal-close" onClick={() => setShowGalleryModal(false)}>✕</button>
            </div>
            <div className="gallery-modal-grid">
              {galleryImages.map((image, index) => (
                <div key={image.id} className="gallery-modal-item" onClick={() => handleImageClick(image)}>
                  <img 
                    src={getImageUrl(image.image_url)} 
                    alt={`Фото ${index + 1}`}
                    onError={handleImageErrorUtil}
                  />
                </div>
              ))}
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
                    onError={handleImageErrorUtil}
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
            onError={handleImageErrorUtil}
          />
          {selectedPostPhotos.length > 1 && (
            <div className="post-fullscreen-counter">
              {selectedPostPhotoIndex + 1} / {selectedPostPhotos.length}
            </div>
          )}
        </div>
      )}
      
      {/* Модалка доната */}
      {showDonationModal && (
        <DonationModal
          userId={id!}
          userName={profile.user.first_name}
          onClose={() => setShowDonationModal(false)}
          onSuccess={handleDonationSuccess}
        />
      )}
      
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        title={authModalTitle}
        message={authModalMessage}
      />
      
      <Footer />
    </div>
  );
};

export default PartnerProfile;