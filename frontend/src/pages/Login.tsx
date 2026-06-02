import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { authAPI } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

interface LoginFormValues {
  email: string;
  password: string;
}

const LoginSchema = Yup.object().shape({
  email: Yup.string().email('Некорректный email').required('Обязательное поле'),
  password: Yup.string().required('Обязательное поле'),
});

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting, setErrors, setFieldError }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      console.log('Отправка данных входа:', values);
      const response = await authAPI.login(values);
      console.log('Ответ сервера при входе:', response.data);
      
      const { access_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      
      const userResponse = await authAPI.getProfile();
      console.log('Данные пользователя:', userResponse.data);
      
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      authLogin(userResponse.data);
      
      console.log('Токен сохранён, перенаправление на профиль...');
      
      // Используем navigate вместо window.location.href (без перезагрузки)
      navigate('/profile');
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      
      if (error.response?.status === 401) {
        // Показываем ошибку под обоими полями
        setErrors({ 
          email: 'Неверный email или пароль',
          password: 'Неверный email или пароль'
        });
      } else {
        setErrors({ email: 'Ошибка входа. Попробуйте снова.' });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="page-wrapper">
      <Header />
      
      <main className="main-content">
        <div className="auth-container">
          <div className="auth-card">
            <h2 className="auth-title">Вход</h2>
            <Formik
              initialValues={{ email: '', password: '' }}
              validationSchema={LoginSchema}
              onSubmit={handleSubmit}
            >
              {({ isSubmitting, errors, touched }) => (
                <Form className="auth-form">
                  <div className="form-group">
                    <label htmlFor="email">Email</label>
                    <Field 
                      id="email"
                      type="email" 
                      name="email" 
                      placeholder="Введите email" 
                      className={touched.email && errors.email ? 'error-input' : ''}
                    />
                    <ErrorMessage name="email" component="div" className="error" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password">Пароль</label>
                    <Field 
                      id="password"
                      type="password" 
                      name="password" 
                      placeholder="Введите пароль" 
                      className={touched.password && errors.password ? 'error-input' : ''}
                    />
                    <ErrorMessage name="password" component="div" className="error" />
                  </div>
                  
                  <button type="submit" disabled={isSubmitting} className="auth-button">
                    {isSubmitting ? 'Вход...' : 'Войти'}
                  </button>
                  
                  <div className="auth-links">
                    Нет аккаунта? <a href="/register">Зарегистрироваться</a>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Login;