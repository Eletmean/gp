import React, { useState, useEffect } from 'react';
import { partnersAPI } from '../services/api';
import type { Friend, FriendRequest } from '../services/api';
import { getAvatarUrl, handleImageError } from '../utils/avatar';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose, currentUserId }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab, currentUserId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'friends' && currentUserId) {
        const response = await partnersAPI.getUserFriends(currentUserId);
        setFriends(response.data);
      } else if (activeTab === 'requests') {
        const response = await partnersAPI.getFriendRequests();
        console.log('Запросы:', response.data);
        setRequests(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async (requestId: number) => {
    try {
      await partnersAPI.acceptFriendRequest(requestId);
      await fetchData();
      alert('Запрос принят');
    } catch (error) {
      console.error('Error accepting request:', error);
      alert('Ошибка при принятии запроса');
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      await partnersAPI.rejectFriendRequest(requestId);
      await fetchData();
      alert('Запрос отклонен');
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert('Ошибка при отклонении запроса');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Друзья</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-tabs">
          <button 
            className={`tab-btn ${activeTab === 'friends' ? 'active' : ''}`}
            onClick={() => setActiveTab('friends')}
          >
            Друзья ({friends.length})
          </button>
          <button 
            className={`tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
            onClick={() => setActiveTab('requests')}
          >
            Запросы ({requests.length})
          </button>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Загрузка...</p>
          </div>
        ) : activeTab === 'friends' ? (
          <div className="friends-list">
            {friends.length === 0 ? (
              <div className="empty-state">
                <p>У вас пока нет друзей</p>
              </div>
            ) : (
              friends.map(friend => (
                <div key={friend.id} className="friend-item">
                  <img 
                    src={getAvatarUrl(friend.avatar)} 
                    alt={friend.username}
                    className="friend-avatar"
                    onError={handleImageError}
                  />
                  <div className="friend-info">
                    <p className="friend-name">{friend.first_name}</p>
                    <p className="friend-username">@{friend.username}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="requests-list">
            {requests.length === 0 ? (
              <div className="empty-state">
                <p>Нет новых запросов</p>
              </div>
            ) : (
              requests.map(request => {
                // Используем поле user (оно есть в типе FriendRequest)
                const sender = request.user;
                if (!sender) {
                  console.log('Нет отправителя для запроса:', request);
                  return null;
                }
                
                return (
                  <div key={request.id} className="request-item">
                    <img 
                      src={getAvatarUrl(sender.avatar)} 
                      alt={sender.username}
                      className="request-avatar"
                      onError={handleImageError}
                    />
                    <div className="request-info">
                      <p className="request-name">{sender.first_name}</p>
                      <p className="request-username">@{sender.username}</p>
                    </div>
                    <div className="request-actions">
                      <button 
                        className="accept-btn"
                        onClick={() => handleAcceptRequest(request.id)}
                      >
                        Принять
                      </button>
                      <button 
                        className="reject-btn"
                        onClick={() => handleRejectRequest(request.id)}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsModal;