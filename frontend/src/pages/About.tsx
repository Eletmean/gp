import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import InDevelopment from '../components/common/InDevelopment';

const About: React.FC = () => {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content">
        <div className="content-container">
          <InDevelopment 
            title="О нас" 
            subtitle="Страница находится в разработке"
            description="Скоро здесь появится информация о нашей платформе и команде."
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default About;