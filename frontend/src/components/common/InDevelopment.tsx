// src/components/common/InDevelopment.tsx
import React from 'react';
import '../../styles/InDevelopment.css'; // Путь изменился!

interface InDevelopmentProps {
  title: string;
  subtitle?: string;
  description?: string;
}

const InDevelopment: React.FC<InDevelopmentProps> = ({ 
  title, 
  subtitle = "Страница находится в разработке", 
  description 
}) => {
  return (
    <div className="in-development-container">
      <div className="in-development-content">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
        {description && <p className="description">{description}</p>}
        <div className="back-button">
          <a href="/" className="back-link">Вернуться на главную</a>
        </div>
      </div>
    </div>
  );
};

export default InDevelopment;