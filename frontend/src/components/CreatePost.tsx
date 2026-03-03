import React, { useState } from 'react';
import { postsAPI } from '../services/api';

interface CreatePostProps {
  onClose: () => void;
  onPostCreated: () => void;
}

const CreatePost: React.FC<CreatePostProps> = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim()) {
      setError('Введите текст поста');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Временно отключаем создание поста в базе данных
      console.log('Создание поста (тестовый режим):', { content, imageFile });
      
      // Имитируем успешное создание
      setTimeout(() => {
        onPostCreated();
        onClose();
      }, 1000);
      
      // Старый код закомментирован:
      // const formData = new FormData();
      // formData.append('content', content);
      
      // if (imageFile) {
      //   formData.append('image', imageFile);
      // }
      
      // await postsAPI.createPost(formData);
      // onPostCreated();
      // onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Ошибка при создании поста');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'rgba(0,0,0,0.5)',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        padding: '30px',
        borderRadius: '10px',
        width: '500px',
        maxWidth: '90%',
        maxHeight: '90%',
        overflow: 'auto'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}>Создать пост</h2>
          <button 
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#666'
            }}
          >
            ×
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="content" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Текст поста</label>
            <textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                minHeight: '100px',
                resize: 'vertical'
              }}
              placeholder="Что у вас нового?"
            />
          </div>
          
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="image" style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Изображение</label>
            <input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              style={{ width: '100%', padding: '5px' }}
            />
            {imagePreview && (
              <div style={{ marginTop: '10px' }}>
                <img 
                  src={imagePreview} 
                  alt="Preview" 
                  style={{ maxWidth: '100%', maxHeight: '200px', borderRadius: '5px' }}
                />
              </div>
            )}
          </div>
          
          {error && (
            <div style={{ 
              background: '#f8d7da', 
              color: '#721c24', 
              padding: '10px', 
              borderRadius: '5px',
              marginBottom: '20px'
            }}>
              {error}
            </div>
          )}
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button 
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer'
              }}
            >
              Отмена
            </button>
            <button 
              type="submit"
              disabled={loading || !content.trim()}
              style={{
                padding: '10px 20px',
                background: loading || !content.trim() ? '#ccc' : '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: loading || !content.trim() ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Публикация...' : 'Опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePost;