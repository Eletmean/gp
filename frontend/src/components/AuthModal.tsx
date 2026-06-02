import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AuthModal.css';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, title, message }) => {
  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <h3>{title}</h3>
          <button className="auth-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="auth-modal-body">
          <p>{message}</p>
        </div>
        <div className="auth-modal-footer">
          <Link to="/login" className="auth-modal-btn login-btn" onClick={onClose}>
            Войти
          </Link>
          <Link to="/register" className="auth-modal-btn register-btn" onClick={onClose}>
            Регистрация
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AuthModal;