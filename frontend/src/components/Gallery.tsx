import React, { useState } from 'react';
import { getImageUrl, handleImageError } from '../utils/image';

interface GalleryImage {
  id: number;
  post_id: number;
  image_url: string;
  created_at: string;
}

interface GalleryProps {
  images: GalleryImage[];
  onClose: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ images, onClose }) => {
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const handleImageClick = (image: GalleryImage, index: number) => {
    setSelectedImage(image);
    setCurrentIndex(index);
  };

  const closeFullscreen = () => {
    setSelectedImage(null);
  };

  const nextImage = () => {
    if (currentIndex < images.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedImage(images[currentIndex + 1]);
    }
  };

  const prevImage = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSelectedImage(images[currentIndex - 1]);
    }
  };

  return (
    <>
      {/* Модалка галереи */}
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content gallery-modal" onClick={(e) => e.stopPropagation()}>
          <div className="gallery-modal-header">
            <h2 className="gallery-modal-title">Все фото ({images.length})</h2>
            <button 
              className="gallery-modal-close"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
          <div className="gallery-modal-grid">
            {images.map((image, index) => (
              <div 
                key={image.id} 
                className="gallery-modal-item"
                onClick={() => handleImageClick(image, index)}
              >
                <img 
                  src={getImageUrl(image.image_url)} 
                  alt={`Фото ${index + 1}`}
                  className="gallery-modal-img"
                  onError={handleImageError}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Полноэкранный просмотр фото */}
      {selectedImage && (
        <div className="gallery-fullscreen-modal" onClick={closeFullscreen}>
          <button 
            className="gallery-fullscreen-close"
            onClick={closeFullscreen}
          >
            ✕
          </button>
          
          {images.length > 1 && (
            <>
              {currentIndex > 0 && (
                <button 
                  className="gallery-fullscreen-nav prev"
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImage();
                  }}
                >
                  ‹
                </button>
              )}
              {currentIndex < images.length - 1 && (
                <button 
                  className="gallery-fullscreen-nav next"
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImage();
                  }}
                >
                  ›
                </button>
              )}
            </>
          )}
          
          <img 
            src={getImageUrl(selectedImage.image_url)} 
            alt="Full size"
            className="gallery-fullscreen-img"
            onClick={(e) => e.stopPropagation()}
            onError={handleImageError}
          />
          
          {images.length > 1 && (
            <div className="gallery-fullscreen-counter">
              {currentIndex + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Gallery;