import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import InDevelopment from '../components/common/InDevelopment';

const Merch: React.FC = () => {
  return (
    <div className="page-wrapper">
      <Header /> {/* Убрали props */}
      <main className="main-content">
        <div className="content-container">
          <InDevelopment 
            title="Мерч" 
            subtitle="Страница находится в разработке"
            description="Скоро здесь появится уникальный мерч от нашей платформы! Одежда, аксессуары и многое другое для настоящих геймеров."
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Merch;