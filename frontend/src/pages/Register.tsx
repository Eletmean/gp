import React, { useState } from 'react';
import { authAPI, login } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import '../styles/Auth.css';

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    first_name: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Очищаем ошибку при вводе
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.email) {
      newErrors.email = 'Email обязателен';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email (пример: example@mail.com)';
    }
    
    if (!formData.username) {
      newErrors.username = 'Никнейм обязателен';
    } else if (formData.username.length < 3) {
      newErrors.username = 'Никнейм должен содержать минимум 3 символа';
    }
    
    if (!formData.first_name) {
      newErrors.first_name = 'Имя обязательно';
    } else if (formData.first_name.length < 2) {
      newErrors.first_name = 'Имя должно содержать минимум 2 буквы';
    }
    
    if (!formData.password) {
      newErrors.password = 'Пароль обязателен';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Пароль: минимум 8 символов, включая A-Z, a-z, 0-9, !@#$%^&*';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Пароль: минимум 8 символов, включая A-Z, a-z, 0-9, !@#$%^&*';
    } else if (!/[a-z]/.test(formData.password)) {
      newErrors.password = 'Пароль: минимум 8 символов, включая A-Z, a-z, 0-9, !@#$%^&*';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Пароль: минимум 8 символов, включая A-Z, a-z, 0-9, !@#$%^&*';
    } else if (!/[!@#$%^&*]/.test(formData.password)) {
      newErrors.password = 'Пароль: минимум 8 символов, включая A-Z, a-z, 0-9, !@#$%^&*';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      console.log('Отправка данных регистрации:', formData);
      
      await authAPI.register(formData);
      console.log('Регистрация успешна, выполняем вход...');
      
      const userData = await login(formData.email, formData.password);
      console.log('Вход выполнен, пользователь:', userData);
      
      window.location.href = '/profile';
    } catch (error: any) {
      console.error('Ошибка регистрации:', error);
      
      if (error.response?.status === 400) {
        const detail = error.response.data?.detail;
        if (detail && detail.includes('email')) {
          setErrors({ email: 'Пользователь с таким email уже существует' });
        } else if (detail && detail.includes('username') || detail && detail.includes('именем')) {
          setErrors({ username: 'Пользователь с таким никнеймом уже существует' });
        } else {
          setErrors({ email: detail || 'Ошибка регистрации' });
        }
      } else if (error.response?.status === 422) {
        setErrors({ email: 'Проверьте правильность введенных данных' });
      } else if (error.code === 'ERR_NETWORK') {
        setErrors({ email: 'Ошибка соединения с сервером' });
      } else {
        setErrors({ email: 'Ошибка регистрации. Попробуйте снова.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="auth-container">
          <div className="auth-card">
            <h2 className="auth-title">Регистрация</h2>
            
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="example@mail.com"
                  className={errors.email ? 'error-input' : ''}
                />
                {errors.email && <div className="error">{errors.email}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="username">Никнейм (логин)</label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Введите никнейм"
                  className={errors.username ? 'error-input' : ''}
                />
                {errors.username && <div className="error">{errors.username}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="first_name">Имя</label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="Введите ваше имя"
                  className={errors.first_name ? 'error-input' : ''}
                />
                {errors.first_name && <div className="error">{errors.first_name}</div>}
              </div>
              
              <div className="form-group">
                <label htmlFor="password">Пароль</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Введите пароль"
                  className={errors.password ? 'error-input' : ''}
                />
                {errors.password && <div className="error password-error">{errors.password}</div>}
              </div>
              
              <button 
                type="submit" 
                disabled={loading} 
                className="auth-button"
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>
              
              <div className="auth-links">
                Уже есть аккаунт? <a href="/login">Войти</a>
              </div>
            </form>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Register;