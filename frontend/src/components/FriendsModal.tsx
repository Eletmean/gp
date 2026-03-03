import React, { useState, useEffect } from 'react';
import { friendsAPI } from '../services/api';
import type { Friend, FriendRequest } from '../services/api';

interface FriendsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FriendsModal: React.FC<FriendsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'followers'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (activeTab === 'friends') {
        const response = await friendsAPI.getFriends();
        setFriends(response.data);
      } else if (activeTab === 'requests') {
        const response = await friendsAPI.getFriendRequests();
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
      // Проверяем, есть ли такой метод в API
      if (friendsAPI.acceptFriendRequest) {
        await friendsAPI.acceptFriendRequest();
      } else {
        console.log('Accept request (fallback):', requestId);
        // Временно просто обновляем данные
        fetchData();
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    }
  };

  const handleRejectRequest = async (requestId: number) => {
    try {
      if (friendsAPI.rejectFriendRequest) {
        await friendsAPI.rejectFriendRequest();
      } else {
        console.log('Reject request (fallback):', requestId);
        fetchData();
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '10px',
        padding: '20px',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '80%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Друзья и подписчики</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          <button 
            onClick={() => setActiveTab('friends')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'friends' ? '#007bff' : '#f0f0f0',
              color: activeTab === 'friends' ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Друзья
          </button>
          <button 
            onClick={() => setActiveTab('requests')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'requests' ? '#007bff' : '#f0f0f0',
              color: activeTab === 'requests' ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Запросы
          </button>
          <button 
            onClick={() => setActiveTab('followers')}
            style={{
              padding: '10px 20px',
              background: activeTab === 'followers' ? '#007bff' : '#f0f0f0',
              color: activeTab === 'followers' ? 'white' : 'black',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            Подписчики
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>Загрузка...</div>
        ) : activeTab === 'friends' ? (
          <div>
            <h3>Друзья ({friends.length})</h3>
            {friends.length === 0 ? (
              <p>У вас пока нет друзей</p>
            ) : (
              <div>
                {friends.map(friend => (
                  <div key={friend.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    padding: '10px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <img 
                      src={friend.avatar || '/default-avatar.png'} 
                      alt={friend.username}
                      style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: 'bold' }}>{friend.username}</p>
                      <p style={{ margin: 0, color: '#666' }}>{friend.first_name} {friend.last_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : activeTab === 'requests' ? (
          <div>
            <h3>Запросы в друзья ({requests.length})</h3>
            {requests.length === 0 ? (
              <p>Нет новых запросов</p>
            ) : (
              <div>
                {requests.map(request => (
                  <div key={request.id} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '10px',
                    borderBottom: '1px solid #eee'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <img 
                        src={request.from_user?.avatar || '/default-avatar.png'} 
                        alt={request.from_user?.username || 'User'}
                        style={{ width: '40px', height: '40px', borderRadius: '50%', marginRight: '10px' }}
                      />
                      <div>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{request.from_user?.username || 'Unknown'}</p>
                        <p style={{ margin: 0, color: '#666' }}>
                          {request.from_user?.first_name || ''} {request.from_user?.last_name || ''}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button 
                        onClick={() => handleAcceptRequest(request.id)}
                        style={{
                          padding: '5px 15px',
                          background: '#28a745',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Принять
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(request.id)}
                        style={{
                          padding: '5px 15px',
                          background: '#dc3545',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        Отклонить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3>Подписчики</h3>
            <p>Функционал подписчиков будет добавлен позже</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FriendsModal;