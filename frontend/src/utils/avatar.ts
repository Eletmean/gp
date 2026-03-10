// src/utils/avatar.ts

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
  
  // Если аватар из бэкенда (начинается с /static/)
  if (avatar.startsWith('/static/')) {
    // Заменяем /static/ на /backend-static/
    return avatar.replace('/static/', '/backend-static/');
  }
  
  return avatar;
};

/**
 * Обработчик ошибки загрузки изображения
 * @param event - событие ошибки
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = event.target as HTMLImageElement;
  console.error('Failed to load image:', target.src);
  target.src = '/images/default-avatar.svg';
  target.onerror = null;
};