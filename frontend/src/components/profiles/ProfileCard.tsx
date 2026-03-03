import React from 'react';
import { Link } from 'react-router-dom';
import { getAvatarUrl, handleImageError } from '../../utils/avatar';
import '../../styles/ProfileCard.css'; 

interface Profile {
  id: number;
  user: {
    id: number;
    username: string;
    avatar_url?: string;
  };
  rating?: number;
  rank?: string;
  playtime?: number;
}

interface ProfileCardProps {
  profile: Profile;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ profile }) => {
  return (
    <div className="profile-card">
      <div className="profile-avatar-section">
        <div className="profile-avatar">
          <img 
            src={getAvatarUrl(profile.user.avatar_url)}
            alt={profile.user.username}
            className="avatar-image"
            onError={handleImageError}
          />
        </div>
      </div>

      <div className="profile-content">
        <h3 className="profile-username">{profile.user.username}</h3>

        {profile.rating && (
          <div className="profile-description">
            Рейтинг: {profile.rating}
          </div>
        )}

        <div className="profile-service">
          <div className="service-info">
            {profile.playtime && (
              <div className="service-time">
                <span className="time-current">{profile.playtime}ч</span>
                <span className="time-separator">/</span>
                <span className="time-total">в игре</span>
              </div>
            )}
          </div>
        </div>

        {profile.rank && (
          <div className="profile-game">
            <div className="game-info">
              <span className="game-rank">Ранг: {profile.rank}</span>
            </div>
          </div>
        )}

        <div className="profile-actions">
          <Link to={`/profile/${profile.user.id}`} className="btn btn-primary">
            Профиль
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ProfileCard;