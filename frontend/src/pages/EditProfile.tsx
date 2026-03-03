import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, gamesAPI } from '../services/api';
import type { UserProfile, UserGame } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import { getAvatarUrl, handleImageError } from '../utils/avatar';
import '../styles/EditProfile.css';

interface Game {
  id: number;
  name: string;
  image_url?: string;
}

const EditProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user: contextUser, logout } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    bio: '',
    favorite_game: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [user, setUser] = useState<UserProfile | null>(null);
  
  // Реальные данные игр
  const [userGames, setUserGames] = useState<UserGame[]>([]);
  const [allGames, setAllGames] = useState<Game[]>([]);
  const [loadingGames, setLoadingGames] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchGames();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await authAPI.getProfile();
      const userData = response.data;
      setUser(userData);
      
      setFormData({
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        bio: userData.bio || '',
        favorite_game: userData.favorite_game || '',
      });
      
      if (userData.avatar) {
        setAvatarPreview(userData.avatar);
      }

      // Загружаем игры пользователя
      await fetchUserGames();
    } catch (error) {
      console.error('Error fetching profile:', error);
      navigate('/profile');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserGames = async () => {
    try {
      const response = await gamesAPI.getUserGames();
      setUserGames(response.data);
    } catch (error) {
      console.error('Error fetching user games:', error);
    }
  };

  const fetchGames = async () => {
    try {
      setLoadingGames(true);
      const response = await gamesAPI.getAllGames();
      setAllGames(response.data);
    } catch (error) {
      console.error('Error fetching games:', error);
    } finally {
      setLoadingGames(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAvatarFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddGame = async (gameId: number) => {
    try {
      await gamesAPI.addUserGame({ game_id: gameId, hours_played: 0 });
      await fetchUserGames();
    } catch (error) {
      console.error('Error adding game:', error);
    }
  };

  const handleRemoveGame = async (userGameId: number) => {
    try {
      await gamesAPI.removeUserGame(userGameId);
      await fetchUserGames();
    } catch (error) {
      console.error('Error removing game:', error);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'Имя обязательно';
    }
    
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Фамилия обязательна';
    }
    
    if (formData.bio.length > 1000) {
      newErrors.bio = 'Био не должно превышать 1000 символов';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    
    try {
      const formDataToSend = new FormData();
      formDataToSend.append('first_name', formData.first_name);
      formDataToSend.append('last_name', formData.last_name);
      formDataToSend.append('bio', formData.bio);
      formDataToSend.append('favorite_game', formData.favorite_game);
      
      if (avatarFile) {
        formDataToSend.append('avatar', avatarFile);
      }
      
      const response = await authAPI.updateProfile(formDataToSend);
      
      localStorage.setItem('user', JSON.stringify(response.data));
      navigate('/profile');
      
    } catch (error: any) {
      console.error('Error updating profile:', error);
      
      if (error.response?.data) {
        const errorData = error.response.data;
        const newErrors: Record<string, string> = {};
        
        Object.keys(errorData).forEach(key => {
          if (Array.isArray(errorData[key])) {
            newErrors[key] = errorData[key][0];
          } else {
            newErrors[key] = errorData[key];
          }
        });
        
        setErrors(newErrors);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate('/profile');
  };

  // Доступные для добавления игры (которых нет у пользователя)
  const availableGames = allGames.filter(game => 
    !userGames.some(userGame => userGame.game.id === game.id)
  );

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="edit-profile-container">
          <div className="edit-profile-content">
            <h1 className="edit-profile-title">Редактирование профиля</h1>
            
            {loading ? (
              <div className="profile-loading-container">
                <div className="profile-loading-spinner"></div>
                <h3>Загрузка профиля...</h3>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="edit-profile-form">
                {/* Avatar section */}
                <div className="avatar-section">
                  <h3 className="section-title">Аватар</h3>
                  <div className="avatar-preview-container">
                    {avatarPreview ? (
                      <img 
                        src={avatarPreview.startsWith('data:') ? avatarPreview : getAvatarUrl(avatarPreview)}
                        alt="Avatar preview" 
                        className="avatar-preview"
                        onError={handleImageError}
                      />
                    ) : (
                      <img 
                        src={getAvatarUrl('')}
                        alt="Default avatar" 
                        className="avatar-preview"
                        onError={handleImageError}
                      />
                    )}
                  </div>
                  
                  <div className="avatar-upload">
                    <input
                      type="file"
                      id="avatar-upload"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="avatar-file-input"
                    />
                    <label htmlFor="avatar-upload" className="avatar-upload-btn">
                      Выбрать изображение
                    </label>
                    <p className="avatar-upload-info">JPG, PNG, GIF до 5MB</p>
                  </div>
                </div>
                
                {/* Basic info section */}
                <div className="basic-info-section">
                  <div className="form-group">
                    <label htmlFor="first_name" className="form-label">Имя *</label>
                    <input
                      id="first_name"
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleInputChange}
                      className={`form-input ${errors.first_name ? 'error' : ''}`}
                      required
                    />
                    {errors.first_name && <span className="error-message">{errors.first_name}</span>}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="last_name" className="form-label">Фамилия *</label>
                    <input
                      id="last_name"
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleInputChange}
                      className={`form-input ${errors.last_name ? 'error' : ''}`}
                      required
                    />
                    {errors.last_name && <span className="error-message">{errors.last_name}</span>}
                  </div>
                </div>
                
                {/* Bio section */}
                <div className="bio-section">
                  <h3 className="section-title">О себе</h3>
                  <div className="form-group">
                    <label htmlFor="bio" className="form-label">Био</label>
                    <textarea
                      id="bio"
                      name="bio"
                      value={formData.bio}
                      onChange={handleInputChange}
                      rows={4}
                      placeholder="Расскажите о себе..."
                      className={`bio-textarea ${errors.bio ? 'error' : ''}`}
                    />
                    <div className={`char-count ${formData.bio.length > 1000 ? 'error' : ''}`}>
                      {formData.bio.length}/1000 символов
                    </div>
                    {errors.bio && <span className="error-message">{errors.bio}</span>}
                  </div>
                </div>

                {/* Favorite Game section */}
                <div className="favorite-game-section">
                  <h3 className="section-title">Любимая игра</h3>
                  <div className="form-group">
                    <select
                      name="favorite_game"
                      value={formData.favorite_game}
                      onChange={handleInputChange}
                      className="form-select"
                    >
                      <option value="">Не выбрано</option>
                      {allGames.map(game => (
                        <option key={game.id} value={game.name}>
                          {game.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Games section */}
                <div className="games-section">
                  <h3 className="section-title">Мои игры</h3>
                  
                  {/* Мои игры */}
                  <div className="my-games-list">
                    {userGames.length === 0 ? (
                      <p className="no-games-message">Вы еще не добавили игры</p>
                    ) : (
                      <div className="games-grid">
                        {userGames.map(userGame => (
                          <div key={userGame.id} className="game-card">
                            <div className="game-card-content">
                              <span className="game-name">{userGame.game.name}</span>
                              {userGame.hours_played > 0 && (
                                <span className="game-hours">{userGame.hours_played}ч</span>
                              )}
                            </div>
                            <button 
                              type="button"
                              className="remove-game-btn"
                              onClick={() => handleRemoveGame(userGame.id)}
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Доступные игры */}
                  {loadingGames ? (
                    <p>Загрузка игр...</p>
                  ) : availableGames.length > 0 && (
                    <div className="available-games-section">
                      <h4 className="available-games-title">Добавить игру</h4>
                      <div className="available-games-grid">
                        {availableGames.map(game => (
                          <div key={game.id} className="available-game-card">
                            <div className="available-game-content">
                              <span className="game-name">{game.name}</span>
                            </div>
                            <button 
                              type="button"
                              className="add-game-from-list-btn"
                              onClick={() => handleAddGame(game.id)}
                            >
                              +
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Form actions */}
                <div className="form-actions">
                  <button 
                    type="button" 
                    onClick={handleCancel} 
                    disabled={saving}
                    className="cancel-btn"
                  >
                    Отмена
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="save-btn"
                  >
                    {saving ? 'Сохранение...' : 'Сохранить изменения'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default EditProfile;