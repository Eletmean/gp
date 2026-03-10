import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarUrl, handleImageError } from '../../utils/avatar';
import '../../styles/Partners.css';

interface Partner {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  bio: string;
  avatar: string;
  favorite_game: string | null;
  is_friend: boolean;
  friendship_status: 'pending' | 'accepted' | 'rejected' | null;
}

interface PartnerCardProps {
  partner: Partner;
  onSendRequest: (id: string) => void;
  onRemoveFriend: (id: string) => void;
  isAuthenticated: boolean; // Добавили пропс
}

const PartnerCard: React.FC<PartnerCardProps> = ({ 
  partner, 
  onSendRequest, 
  onRemoveFriend,
  isAuthenticated 
}) => {
  const getFullName = () => {
    return `${partner.first_name} ${partner.last_name}`;
  };

  const renderActionButton = () => {
    if (!isAuthenticated) {
      return (
        <Link to="/login" className="btn btn-primary btn-sm">
          Войдите чтобы добавить
        </Link>
      );
    }

    if (partner.is_friend) {
      return (
        <button 
          className="btn btn-danger btn-sm"
          onClick={() => onRemoveFriend(partner.id)}
        >
          Удалить из друзей
        </button>
      );
    }

    if (partner.friendship_status === 'pending') {
      return (
        <button className="btn btn-secondary btn-sm" disabled>
          Запрос отправлен
        </button>
      );
    }

    return (
      <button 
        className="btn btn-primary btn-sm"
        onClick={() => onSendRequest(partner.id)}
      >
        Добавить в друзья
      </button>
    );
  };

  return (
    <div className="partner-card">
      <div className="partner-card-header">
        <img 
          src={getAvatarUrl(partner.avatar)} 
          alt={partner.username}
          className="partner-avatar"
          onError={handleImageError}
        />
        <div className="partner-info">
          <h3 className="partner-name">{getFullName()}</h3>
          <div className="partner-username">@{partner.username}</div>
        </div>
      </div>

      <div className="partner-card-body">
        <p className="partner-bio">
          {partner.bio || 'Пользователь пока не добавил информацию о себе'}
        </p>
        
        {partner.favorite_game && (
          <div className="partner-favorite-game">
            <span className="game-name">{partner.favorite_game}</span>
          </div>
        )}
      </div>

      <div className="partner-card-footer">
        <div className="footer-left">
          {renderActionButton()}
        </div>
        <div className="footer-right">
          <Link to={`/partner/${partner.id}`} className="btn btn-outline btn-sm">
            Перейти в профиль
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PartnerCard;