import React, { useState, useEffect } from 'react';
import { donationsAPI } from '../services/api';

interface DonationModalProps {
  userId: string;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface Tier {
  id: number;
  name: string;
  price: number;
  duration_days: number;
  icon: string;
  color: string;
  benefits: string[];
}

const DonationModal: React.FC<DonationModalProps> = ({ userId, userName, onClose, onSuccess }) => {
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);
  const [oneTimeAmount, setOneTimeAmount] = useState<number>(100);
  const [donationType, setDonationType] = useState<'subscription' | 'one_time'>('subscription');
  const [loading, setLoading] = useState(false);
  const [loadingTiers, setLoadingTiers] = useState(true);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [successTitle, setSuccessTitle] = useState('');

  useEffect(() => {
    const fetchTiers = async () => {
      try {
        const response = await donationsAPI.getTiers();
        setTiers(response.data);
      } catch (error) {
        console.error('Error fetching tiers:', error);
      } finally {
        setLoadingTiers(false);
      }
    };
    fetchTiers();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedTier) return;
    setLoading(true);
    try {
      const selectedTierData = tiers.find(t => t.id === selectedTier);
      await donationsAPI.subscribe(userId, selectedTier);
      setSuccessTitle('Подписка оформлена!');
      setSuccessMessage(`Вы успешно оформили подписку на тариф "${selectedTierData?.name}". Спасибо за поддержку!`);
      setShowSuccessModal(true);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка при оформлении подписки');
    } finally {
      setLoading(false);
    }
  };

  const handleOneTimeDonate = async () => {
    setLoading(true);
    try {
      await donationsAPI.oneTimeDonate(userId, oneTimeAmount);
      setSuccessTitle('Спасибо за донат!');
      setSuccessMessage(`Вы поддержали ${userName} на сумму ${oneTimeAmount} ₽. Это очень ценно!`);
      setShowSuccessModal(true);
      onSuccess();
    } catch (error) {
      console.error('Error:', error);
      alert('Ошибка при отправке доната');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    onClose();
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

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content donation-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2 className="modal-title">Поддержать {userName}</h2>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="donation-tabs">
            <button 
              className={`donation-tab ${donationType === 'subscription' ? 'active' : ''}`}
              onClick={() => setDonationType('subscription')}
            >
              Подписка
            </button>
            <button 
              className={`donation-tab ${donationType === 'one_time' ? 'active' : ''}`}
              onClick={() => setDonationType('one_time')}
            >
              Разовый донат
            </button>
          </div>

          {donationType === 'subscription' ? (
            <>
              {loadingTiers ? (
                <div className="loading-spinner-small">Загрузка...</div>
              ) : (
                <div className="tiers-grid">
                  {tiers.map(tier => (
                    <div 
                      key={tier.id}
                      className={`tier-card ${selectedTier === tier.id ? 'selected' : ''}`}
                      onClick={() => setSelectedTier(tier.id)}
                      style={{ borderColor: selectedTier === tier.id ? tier.color : 'var(--border-color)' }}
                    >
                      <div className="tier-icon" style={{ background: tier.color }}>{tier.icon}</div>
                      <h3 className="tier-name">{getRussianName(tier.name)}</h3>
                      <div className="tier-price" style={{ color: 'white' }}>{tier.price} ₽</div>
                      <div className="tier-duration">{tier.duration_days} дней</div>
                    </div>
                  ))}
                </div>
              )}
              <button 
                className="btn btn-primary donate-btn"
                onClick={handleSubscribe}
                disabled={!selectedTier || loading}
                style={{ background: 'var(--accent-purple)', width: 'calc(100% - 48px)', margin: '0 24px 24px' }}
              >
                {loading ? 'Оформление...' : 'Оформить подписку'}
              </button>
            </>
          ) : (
            <div className="one-time-donation">
              <p className="one-time-desc">Выберите сумму доната:</p>
              <div className="amount-buttons">
                {[50, 100, 200, 500, 1000].map(amount => (
                  <button
                    key={amount}
                    className={`amount-btn ${oneTimeAmount === amount ? 'active' : ''}`}
                    onClick={() => setOneTimeAmount(amount)}
                  >
                    {amount} ₽
                  </button>
                ))}
              </div>
              <button 
                className="btn btn-primary donate-btn"
                onClick={handleOneTimeDonate}
                disabled={loading}
                style={{ background: 'var(--accent-purple)', width: 'calc(100% - 48px)', margin: '0 24px 24px' }}
              >
                {loading ? 'Обработка...' : `Поддержать на ${oneTimeAmount} ₽`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Модалка благодарности */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={handleCloseSuccess}>
          <div className="modal-content success-modal" onClick={(e) => e.stopPropagation()}>
            <div className="success-icon">✓</div>
            <h2 className="success-title">{successTitle}</h2>
            <p className="success-message">{successMessage}</p>
            <button 
              className="btn btn-primary success-btn"
              onClick={handleCloseSuccess}
              style={{ background: 'var(--accent-purple)' }}
            >
              Отлично
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default DonationModal;