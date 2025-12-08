

import React, { useState, useEffect } from 'react';
import { Heart } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';

const FavBtn = ({ book, className = '', size = 'default' }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);


  const sizes = {
    small: 'w-10 h-10',
    default: 'w-12 h-12',
    large: 'w-14 h-14'
  };

  const iconSizes = {
    small: 'w-5 h-5',
    default: 'w-6 h-6',
    large: 'w-7 h-7'
  };


  useEffect(() => {
    checkFavoriteStatus();
  }, [book.id, isFavorite]);

  const checkFavoriteStatus = async () => {
    try {

      const myFavs = await api.getMyFavorites();
      const exists = myFavs.some(fav =>
        String(fav.book_id) === String(book.book_id || book.id) ||
        String(fav.google_id) === String(book.google_id || book.id)
      );
      setIsFavorite(exists);
    } catch (err) {
      console.error('Error checking favorite status:', err);
    }
  };

  const handleToggleFavorite = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (isAnimating) return;

    const targetId = book.book_id || book.id || book.google_id;

    try {
      if (isFavorite) {

        await api.removeFavorite(targetId);
        setIsFavorite(false);

        toast.success("Removed from favorites");
      } else {

        await api.addFavorite(book);
        setIsFavorite(true);
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 600);

        toast.success("Added to favorites!");
      }


      window.dispatchEvent(new Event('favoritesUpdated'));

    } catch (err) {
      console.error('Error toggling favorite:', err);
      toast.error('Failed to update favorites. Please try again.');
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      className={`
        group relative
        flex items-center justify-center
        ${sizes[size]}
        rounded-full
        transition-all duration-300
        focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
        ${isFavorite
          ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/30'
          : 'bg-white hover:bg-red-50 border-2 border-gray-200 hover:border-red-300'
        }
        ${isAnimating ? 'scale-125' : 'scale-100 hover:scale-110'}
        active:scale-95
        ${className}
      `}
      title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
      aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
    >
      <Heart
        className={`
          ${iconSizes[size]}
          transition-all duration-300
          ${isFavorite
            ? 'fill-white text-white'
            : 'text-gray-400 group-hover:text-red-500 group-hover:fill-red-100'
          }
        `}
      />

      {isAnimating && (
        <>
          <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-75"></span>
          <span className="absolute inset-0 rounded-full bg-red-400 animate-pulse opacity-50"></span>
        </>
      )}
    </button>
  );
};

export default FavBtn;