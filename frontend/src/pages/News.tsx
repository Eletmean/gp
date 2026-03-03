import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import InDevelopment from '../components/common/InDevelopment';

const News: React.FC = () => {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content">
        <div className="content-container">
          <InDevelopment 
            title="Новости" 
            subtitle="Страница находится в разработке"
            description="Скоро здесь появятся новости игровой индустрии и нашей платформы."
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default News;