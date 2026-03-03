import React from 'react';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import InDevelopment from '../components/common/InDevelopment';

const Shop: React.FC = () => {
  return (
    <div className="page-wrapper">
      <Header />
      <main className="main-content">
        <div className="content-container">
          <InDevelopment 
            title="Магазин" 
            subtitle="Страница находится в разработке"
            description="Скоро здесь появится магазин с игровыми товарами и услугами."
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Shop;