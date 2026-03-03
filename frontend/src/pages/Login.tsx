import React from 'react';
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
  const { login: authLogin } = useAuth(); // используем login из контекста (переименовываем чтобы не было конфликта)

  const handleSubmit = async (
    values: LoginFormValues,
    { setSubmitting, setErrors }: FormikHelpers<LoginFormValues>
  ) => {
    try {
      console.log('Отправка данных входа:', values);
      const response = await authAPI.login(values);
      console.log('Ответ сервера при входе:', response.data);
      
      // FastAPI возвращает { access_token: "...", token_type: "bearer" }
      const { access_token } = response.data;
      
      // Сохраняем токен
      localStorage.setItem('access_token', access_token);
      
      // Получаем данные пользователя
      const userResponse = await authAPI.getProfile();
      console.log('Данные пользователя:', userResponse.data);
      
      // Сохраняем пользователя
      localStorage.setItem('user', JSON.stringify(userResponse.data));
      
      // Обновляем контекст авторизации
      authLogin(userResponse.data);
      
      console.log('Токен сохранён, перенаправление на профиль...');
      
      // Перенаправляем на профиль
      window.location.href = '/profile';
    } catch (error: any) {
      console.error('Ошибка входа:', error);
      if (error.response?.status === 401) {
        setErrors({ email: 'Неверный email или пароль' });
      } else {
        setErrors({ email: 'Ошибка входа. Попробуйте снова.' });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="page-wrapper">
      <Header /> {/* Header сам получает данные из контекста */}
      
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