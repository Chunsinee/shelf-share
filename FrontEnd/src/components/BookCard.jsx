
import { useNavigate } from 'react-router-dom';
import { Clock, Users, Star, TrendingUp, Book as BookIcon } from 'lucide-react';

const BookCard = ({ book, rank = null, showStats = false }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const targetId = book.book_id || book.id || book.google_id;
    navigate(`/book/${targetId}`);
  };

  const borrowCount = parseInt(book.borrow_count || 0);
  const queueCount = parseInt(book.queue_count || 0);
  const avgRating = parseFloat(book.avg_rating || book.rating || 0);
  const reviewCount = parseInt(book.review_count || 0);

  return (
    <div
      onClick={handleClick}
      className="bg-white border border-gray-100 rounded-2xl p-4 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full relative"
    >

      {rank && (
        <div className="absolute -top-3 -left-3 z-10">
          <div className="bg-gradient-to-br from-yellow-400 to-orange-500 text-white font-black text-lg w-12 h-12 rounded-full flex items-center justify-center shadow-lg border-4 border-white">
            #{rank}
          </div>
        </div>
      )}

      <div className="h-56 bg-gray-50 rounded-xl mb-4 overflow-hidden relative flex items-center justify-center">
        <img
          src={book.cover_image || "https://via.placeholder.com/150x220?text=No+Cover"}
          alt={book.title}
          className="h-full object-contain group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
          onError={(e) => {
            e.target.src = "https://via.placeholder.com/150x220?text=No+Cover";
          }}
        />

        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-all flex items-center justify-center">
          <span className="bg-white text-[#0770ad] px-4 py-2 rounded-full font-bold text-sm opacity-0 group-hover:opacity-100 transition-all transform group-hover:scale-110 shadow-lg">
            View Details
          </span>
        </div>

        {book.status === 'borrowed' && (
          <div className="absolute top-2 right-2 bg-red-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-md">
            Borrowed
          </div>
        )}
      </div>

      <div className="flex-1 flex flex-col">
        <h3 className="font-bold text-base leading-tight mb-1 line-clamp-2 group-hover:text-[#0770ad] transition-colors">
          {book.title}
        </h3>

        <p className="text-sm text-gray-500 mb-3 line-clamp-1">
          {book.author || 'Unknown Author'}
        </p>

        {showStats && (
          <div className="mt-auto space-y-2 pt-3 border-t border-gray-100">

            {avgRating > 0 && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-bold text-gray-700">{avgRating}</span>
                </div>
                <span className="text-gray-400 text-xs">
                  ({reviewCount} {reviewCount === 1 ? 'review' : 'reviews'})
                </span>
              </div>
            )}

            <div className="flex items-center justify-between gap-3 text-xs">

              {borrowCount > 0 && (
                <div className="flex items-center gap-1.5 text-blue-600">
                  <BookIcon className="w-3.5 h-3.5" />
                  <span className="font-semibold">{borrowCount}</span>
                </div>
              )}

              {queueCount > 0 && (
                <div className="flex items-center gap-1.5 text-orange-600">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="font-semibold">{queueCount}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
          <span className="text-[10px] font-bold uppercase bg-blue-50 text-[#0770ad] px-2 py-1 rounded-md border border-blue-100 truncate">
            {book.category || book.category_name || 'General'}
          </span>

          {book.published_year && (
            <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {book.published_year}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default BookCard;