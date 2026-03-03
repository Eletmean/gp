import React from 'react';

interface GamesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const GamesModal: React.FC<GamesModalProps> = ({ isOpen, onClose }) => {
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
        <h2>Игры</h2>
        <p>Модальное окно с играми</p>
        <button onClick={onClose}>Закрыть</button>
      </div>
    </div>
  );
};

// Убедитесь, что эта строка есть:
export default GamesModal;