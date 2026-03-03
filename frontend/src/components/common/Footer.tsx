import React from 'react';
import '../../styles/Footer.css'; 

const Footer: React.FC = () => {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-content">
          <div className="footer-section">
            <h3 className="footer-title">Game Partner</h3>
            <p className="footer-description">
              Платформа для поиска игровых партнёров и монетизации игрового опыта
            </p>
          </div>
          
          <div className="footer-section">
            <div className="support-section">
              <span className="support-label">Контакты</span>
              <a href="mailto:support@gamepartner.ru" className="support-link">
                support@epal-arcade.ru
              </a>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2024 Game Partner. Все права защищены.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;