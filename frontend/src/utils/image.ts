// src/utils/image.ts

const API_BASE = process.env.REACT_APP_API_URL?.replace('/api/', '') || 'http://localhost:8000';

/**
 * Возвращает корректный URL аватара с заглушкой по умолчанию
 * @param avatar - URL аватара из API или локальный путь
 * @returns полный URL для отображения
 */
export const getAvatarUrl = (avatar?: string | null): string => {
  const DEFAULT_AVATAR = '/images/default-avatar.svg';
  
  if (!avatar) {
    return DEFAULT_AVATAR;
  }
  
  // Если аватар уже начинается с http, возвращаем как есть
  if (avatar.startsWith('http')) {
    return avatar;
  }
  
  // Если аватар локальный (начинается с /)
  if (avatar.startsWith('/')) {
    return avatar;
  }
  
  return `${API_BASE}${avatar}`;
};

/**
 * Возвращает полный URL изображения поста
 * @param imageUrl - относительный URL из БД (например /static/posts/1/image.jpg)
 * @returns полный URL для отображения
 */
export const getImageUrl = (imageUrl?: string | null): string => {
  const DEFAULT_IMAGE = '/images/default-image.svg';
  
  if (!imageUrl) {
    return DEFAULT_IMAGE;
  }
  
  // Если это уже полный URL
  if (imageUrl.startsWith('http')) {
    return imageUrl;
  }
  
  // Если это относительный URL (начинается с /)
  if (imageUrl.startsWith('/')) {
    return `${API_BASE}${imageUrl}`;
  }
  
  return `${API_BASE}/${imageUrl}`;
};

/**
 * Обработчик ошибки загрузки изображения
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = event.target as HTMLImageElement;
  console.warn('Failed to load image:', target.src);
  
  // Если это аватар (проверяем по пути)
  if (target.src.includes('avatar')) {
    target.src = '/images/default-avatar.svg';
  } else {
    // Если это изображение поста
    target.src = '/images/default-image.svg';
  }
  target.onerror = null;
};