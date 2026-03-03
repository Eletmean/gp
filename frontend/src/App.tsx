import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import Games from './pages/Games';
import Partners from './pages/Partners';
import Merch from './pages/Merch';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import PartnerProfile from './pages/PartnerProfile';
import About from './pages/About';
import News from './pages/News';
import Shop from './pages/Shop';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Основные страницы */}
          <Route path="/" element={<Home />} />
          <Route path="/games" element={<Games />} />
          <Route path="/partners" element={<Partners />} />
          <Route path="/merch" element={<Merch />} />
          
          {/* Новые страницы */}
          <Route path="/about" element={<About />} />
          <Route path="/news" element={<News />} />
          <Route path="/shop" element={<Shop />} />
          
          {/* Авторизация */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Профили */}
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/partner/:id" element={<PartnerProfile />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;