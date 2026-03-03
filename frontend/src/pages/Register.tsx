import React from 'react';
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from 'formik';
import * as Yup from 'yup';
import { authAPI, login } from '../services/api';
import Header from '../components/common/Header';
import Footer from '../components/common/Footer';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Auth.css';

interface RegisterFormValues {
  email: string;
  username: string;
  first_name: string;
  last_name: string;
  password: string;
}

const RegisterSchema = Yup.object().shape({
  email: Yup.string().email('Некорректный email').required('Обязательное поле'),
  username: Yup.string().min(3, 'Минимум 3 символа').required('Обязательное поле'),
  first_name: Yup.string().required('Обязательное поле'),
  last_name: Yup.string().required('Обязательное поле'),
  password: Yup.string().min(8, 'Минимум 8 символов').required('Обязательное поле'),
});

const Register: React.FC = () => {
  const { logout } = useAuth(); // используем logout из контекста (на случай если нужно)

  const handleSubmit = async (
    values: RegisterFormValues, 
    { setSubmitting, setErrors }: FormikHelpers<RegisterFormValues>
  ) => {
    try {
      console.log('Отправка данных регистрации:', values);
      
      // 1. Регистрация
      await authAPI.register(values);
      console.log('Регистрация успешна, выполняем вход...');
      
      // 2. Автоматический вход после регистрации
      const userData = await login(values.email, values.password);
      console.log('Вход выполнен, пользователь:', userData);
      
      // 3. Перенаправление на профиль
      window.location.href = '/profile';
    } catch (error: any) {
      console.error('Ошибка регистрации:', error);
      
      // Обработка ошибок от FastAPI
      if (error.response?.data?.detail) {
        // Если есть детальное сообщение
        setErrors({ email: error.response.data.detail });
      } else if (error.response?.data) {
        // Если пришли ошибки полей
        const fieldErrors: any = {};
        if (error.response.data.email) fieldErrors.email = error.response.data.email;
        if (error.response.data.username) fieldErrors.username = error.response.data.username;
        if (error.response.data.password) fieldErrors.password = error.response.data.password;
        setErrors(fieldErrors);
      } else {
        setErrors({ email: 'Ошибка регистрации. Попробуйте снова.' });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="page-wrapper">
      <Header /> {/* Header теперь сам получает данные из контекста */}
      
      <main className="main-content">
        <div className="auth-container">
          <div className="auth-card">
            <h2 className="auth-title">Регистрация</h2>
            <Formik
              initialValues={{
                email: '',
                username: '',
                first_name: '',
                last_name: '',
                password: '',
              }}
              validationSchema={RegisterSchema}
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
                    <label htmlFor="username">Имя пользователя</label>
                    <Field 
                      id="username"
                      type="text" 
                      name="username" 
                      placeholder="Введите имя пользователя" 
                      className={touched.username && errors.username ? 'error-input' : ''}
                    />
                    <ErrorMessage name="username" component="div" className="error" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="first_name">Имя</label>
                    <Field 
                      id="first_name"
                      type="text" 
                      name="first_name" 
                      placeholder="Введите ваше имя" 
                      className={touched.first_name && errors.first_name ? 'error-input' : ''}
                    />
                    <ErrorMessage name="first_name" component="div" className="error" />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="last_name">Фамилия</label>
                    <Field 
                      id="last_name"
                      type="text" 
                      name="last_name" 
                      placeholder="Введите вашу фамилию" 
                      className={touched.last_name && errors.last_name ? 'error-input' : ''}
                    />
                    <ErrorMessage name="last_name" component="div" className="error" />
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
                    {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                  </button>
                  
                  <div className="auth-links">
                    Уже есть аккаунт? <a href="/login">Войти</a>
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

export default Register;