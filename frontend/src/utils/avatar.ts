// src/utils/avatar.ts

/**
 * Возвращает корректный URL аватара с заглушкой по умолчанию
 * @param avatar - URL аватара из API или локальный путь
 * @returns полный URL для отображения
 */
export const getAvatarUrl = (avatar?: string | null): string => {
  const DEFAULT_AVATAR = '/images/default-avatar.svg'; // или '/default-avatar.png'
  
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
  
  // Если аватар из API (относительный путь)
  return `http://localhost:8000${avatar}`;
};

/**
 * Обработчик ошибки загрузки изображения
 * @param event - событие ошибки
 */
export const handleImageError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
  const target = event.target as HTMLImageElement;
  target.src = '/images/default-avatar.svg'; // или '/default-avatar.png'
  target.onerror = null; // предотвращаем бесконечный цикл
};