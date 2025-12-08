import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Book,
  Star,
  Users,
  Globe,
  Loader2,
  Share2,
  MessageSquare,
  Clock,
  Info,
} from "lucide-react";
import Navbar from "../components/Navbar";
import api from "../services/api";
import BorrowBtn from "../components/BorrowBtn";
import FavBtn from "../components/FavBtn";
import BookCard from "../components/BookCard";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [similarBooks, setSimilarBooks] = useState([]);

  const [stats, setStats] = useState({
    queue_count: 0,
    borrow_count: 0,
    avg_rating: 0,
    review_count: 0,
  });
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [userQueueStatus, setUserQueueStatus] = useState(null);
  const [userLoanInfo, setUserLoanInfo] = useState({ count: 0, limit: 5 });

  const [borrowUnit, setBorrowUnit] = useState("days");
  const [borrowAmount, setBorrowAmount] = useState(7);


  const durationOptions = {
    minutes: [5, 10, 15, 30, 45, 60],
    hours: [1, 2, 3, 6, 12, 24],
    days: [1, 3, 7, 14, 21, 30],
    weeks: [1, 2, 3, 4],
  };


  const getTotalHours = () => {
    if (borrowUnit === "minutes") return borrowAmount / 60;
    if (borrowUnit === "hours") return borrowAmount;
    if (borrowUnit === "days") return borrowAmount * 24;
    if (borrowUnit === "weeks") return borrowAmount * 24 * 7;
    return 24;
  };


  const getDueDate = () => {
    const hours = getTotalHours();
    const dueTime = new Date(Date.now() + hours * 60 * 60 * 1000);


    if (borrowUnit === "minutes") {
      return dueTime.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }


    if (borrowUnit === "hours") {
      return dueTime.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }


    return dueTime.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Fetch book details, reviews, and user status
  const refreshAllData = useCallback(async () => {
    try {
      const bookData = await api.getBookById(id);
      setBook(bookData);

      setStats({
        queue_count: bookData.queue_count || 0,
        borrow_count: bookData.borrow_count || 0,
        avg_rating: bookData.avg_rating || 0,
        review_count: bookData.review_count || 0,
      });

      if (user) {
        try {
          const myReservations = await api.getMyReservations();
          if (Array.isArray(myReservations)) {
            const myReservation = myReservations.find(
              (r) => String(r.book_id) === String(id) && r.status === "active"
            );
            if (myReservation) {
              setUserQueueStatus({
                isReserved: true,
                date: myReservation.reservation_date,
                position:
                  myReservation.queue_position || myReservation.queue_no,
              });
            } else {
              setUserQueueStatus(null);
            }
          }

          const myLoans = await api.getBorrowedBooks();
          if (Array.isArray(myLoans)) {
            const activeLoans = myLoans.filter(
              (loan) => loan.status === "active"
            );
            setUserLoanInfo({
              count: activeLoans.length,
              limit: user.borrow_limit || 5,
            });
          }
        } catch (innerErr) {
          console.warn("Status check failed", innerErr);
        }
      }
      return bookData;
    } catch (err) {
      console.error(err);
      throw err;
    }
  }, [id, user]);

  // Ensure scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    let isMounted = true;
    const initFetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const bookData = await refreshAllData();
        if (!isMounted) return;

        try {
          const reviewsData = await api.getBookReviews(id);
          setReviews(Array.isArray(reviewsData) ? reviewsData : []);
        } catch (e) {
          setReviews([]);
        }

        if (bookData) {
          try {
            const allBooks = await api.getBooks();
            if (Array.isArray(allBooks)) {
              const similar = allBooks.filter((b) => {
                const bId = String(b.book_id || b.id || b.google_id);
                const currentId = String(id);
                if (bId === currentId) return false;

                if (bookData.category_id && b.category_id)
                  return String(b.category_id) === String(bookData.category_id);

                const currentCatName =
                  bookData.category_name || bookData.category;
                const targetCatName = b.category || b.category_name;

                if (currentCatName && targetCatName) {
                  return currentCatName === targetCatName;
                }
                return false;
              });
              setSimilarBooks(similar.slice(0, 4));
            }
          } catch (e) { }
        }
      } catch (err) {
        if (isMounted) setError(err.response?.data || "Failed to load book");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    initFetch();
    return () => {
      isMounted = false;
    };
  }, [id, refreshAllData]);

  // Handle adding a review
  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!user) return toast.error("Please login");
    if (!newReview.comment.trim()) return toast.error("Write a comment");
    setSubmittingReview(true);
    try {
      await api.addReview(id, newReview.rating, newReview.comment);
      const updatedReviews = await api.getBookReviews(id);
      setReviews(Array.isArray(updatedReviews) ? updatedReviews : []);
      await refreshAllData();
      setNewReview({ rating: 5, comment: "" });
      toast.success("Review added successfully!");
    } catch (err) {
      toast.error(err.message || "Failed to review");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Handle book borrowing
  const handleBorrow = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    } catch (err) { }
  };

  if (loading)
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Navbar />
        <Loader2 className="w-10 h-10 animate-spin text-[#0770ad]" />
      </div>
    );
  if (error || !book)
    return (
      <div className="min-h-screen bg-gray-50 pt-24">
        <Navbar />
        <div className="text-center text-red-500 font-bold mt-10">
          Book Not Found
        </div>
      </div>
    );

  const description = book.description
    ? book.description.replace(/<[^>]+>/g, "")
    : "No description available";
  const displayDesc = showFullDescription
    ? description
    : description.slice(0, 300) + (description.length > 300 ? "..." : "");
  const isBookAvailable = book.status === "available";

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12">
      <Navbar />
      <div className="container mx-auto px-6 lg:px-16">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-gray-600 hover:text-[#0770ad] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 flex flex-col lg:flex-row overflow-hidden mb-8">
          <div className="lg:w-1/3 bg-gray-50 p-8 flex justify-center items-center relative min-h-[400px]">
            <img
              src={book.cover_image}
              alt={book.title}
              className="h-64 lg:h-80 w-auto object-contain shadow-xl rounded-lg transform hover:scale-105 transition-transform duration-300"
              onError={(e) =>
              (e.target.src =
                "https://via.placeholder.com/300x450?text=No+Cover")
              }
            />
            {!isBookAvailable && (
              <div className="absolute top-6 right-6 bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                Borrowed
              </div>
            )}
          </div>

          <div className="lg:w-2/3 p-8">
            <div className="flex justify-between items-center mb-6">
              <span className="text-[#0770ad] bg-blue-50 px-3 py-1 rounded-full text-xs font-bold uppercase">
                {book.category_name || book.category || "General"}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Link copied to clipboard!");
                }}
                className="hover:bg-gray-100 p-2 rounded-full transition"
              >
                <Share2 className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <h1 className="text-3xl font-black mb-2 text-gray-900 leading-tight">
              {book.title}
            </h1>
            <p className="text-gray-500 text-lg mb-6">by {book.author}</p>

            <div className="grid grid-cols-4 gap-4 mb-8 border-y border-gray-100 py-6">
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
                </div>
                <span className="text-2xl font-bold block text-gray-800">
                  {Number(stats.avg_rating).toFixed(1)}
                </span>
                <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
                  Rating
                </span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="w-8 h-8 text-orange-500" />
                </div>
                <span className="text-2xl font-bold block text-gray-800">
                  {stats.queue_count}
                </span>
                <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
                  Waitlist
                </span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Book className="w-8 h-8 text-blue-500" />
                </div>
                <span className="text-2xl font-bold block text-gray-800">
                  {stats.borrow_count}
                </span>
                <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
                  Borrowed
                </span>
              </div>

              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Globe className="w-8 h-8 text-green-500" />
                </div>
                <span className="text-2xl font-bold block text-gray-800">
                  EN
                </span>
                <span className="text-xs text-gray-400 font-bold tracking-wider uppercase">
                  Language
                </span>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="font-bold text-lg mb-2">Synopsis</h3>
              <p className="text-gray-600 leading-relaxed text-base">
                {displayDesc}
              </p>
              {description.length > 300 && (
                <button
                  onClick={() => setShowFullDescription(!showFullDescription)}
                  className="text-[#0770ad] font-bold text-sm mt-2 hover:underline"
                >
                  {showFullDescription ? "Show Less" : "Read More"}
                </button>
              )}
            </div>

            {user && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3">
                <Info className="w-5 h-5 text-[#0770ad]" />
                <div className="flex flex-col">
                  <span className="text-blue-800 text-sm font-medium">
                    Your Borrow Limit:{" "}
                    <strong className="text-[#0770ad]">
                      {userLoanInfo.count} / {userLoanInfo.limit}
                    </strong>{" "}
                    books.
                  </span>
                  <span className="text-blue-600 text-xs mt-1 font-bold">
                    Note: Limit 1 copy per person for this book.
                  </span>
                </div>
              </div>
            )}

            {userQueueStatus?.isReserved && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div>
                  <h4 className="font-bold text-yellow-800">
                    You are in queue!
                  </h4>
                  <p className="text-sm text-yellow-700">
                    Position #{userQueueStatus.position}
                  </p>
                </div>
              </div>
            )}

            {isBookAvailable ? (
              <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6">
                <label className="block font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <Clock className="w-6 h-6 text-[#0770ad]" /> Select Duration
                </label>

                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {["minutes", "hours", "days", "weeks"].map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => {
                        setBorrowUnit(unit);

                        if (unit === "minutes") setBorrowAmount(30);
                        else if (unit === "hours") setBorrowAmount(3);
                        else if (unit === "days") setBorrowAmount(7);
                        else if (unit === "weeks") setBorrowAmount(2);
                      }}
                      className={`px-4 py-2 rounded-lg font-bold text-sm transition-all whitespace-nowrap ${borrowUnit === unit
                        ? "bg-[#0770ad] text-white shadow-md"
                        : "bg-white text-gray-600 border border-gray-300 hover:border-[#0770ad]"
                        }`}
                    >
                      {unit.charAt(0).toUpperCase() + unit.slice(1)}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 mb-4">
                  {durationOptions[borrowUnit].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setBorrowAmount(amount)}
                      className={`px-4 py-3 rounded-xl font-bold transition-all ${borrowAmount === amount
                        ? "bg-[#0770ad] text-white shadow-md transform scale-105"
                        : "bg-white text-gray-700 border-2 border-gray-200 hover:border-[#0770ad] hover:text-[#0770ad]"
                        }`}
                    >
                      {amount}
                    </button>
                  ))}
                </div>
                <div className="bg-white border-2 border-[#0770ad] rounded-xl p-4 flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 font-medium">
                      Total Duration
                    </p>
                    <p className="text-lg font-black text-[#0770ad]">
                      {borrowAmount} {borrowUnit}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 font-medium">
                      Due Date
                    </p>
                    <p className="text-sm font-bold text-gray-900">
                      {getDueDate()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mb-6 bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
                <Info className="w-8 h-8 text-orange-500 mx-auto mb-2" />
                <h3 className="font-bold text-orange-800 text-lg">
                  Currently Unavailable
                </h3>
                <p className="text-orange-600 text-sm">
                  Borrowed by another user.
                </p>
              </div>
            )}

            <div className="flex gap-4 mb-8">
              {!userQueueStatus?.isReserved && (
                <BorrowBtn
                  book={book}
                  hours={getTotalHours()}
                  className="flex-1 justify-center py-4 text-base font-bold"
                  onUpdate={refreshAllData}
                />
              )}
              <FavBtn book={book} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 lg:p-12 mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-[#0770ad]" /> Reviews (
            {reviews.length})
          </h2>
          {user && (
            <form
              onSubmit={handleReviewSubmit}
              className="mb-8 bg-gray-50 rounded-xl p-6"
            >
              <h3 className="font-bold mb-4">Write a Review</h3>
              <div className="mb-4">
                <label className="block font-semibold mb-2 text-gray-700">
                  Rating
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() =>
                        setNewReview({ ...newReview, rating: num })
                      }
                      className="focus:outline-none transform hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${num <= newReview.rating
                          ? "text-yellow-400 fill-yellow-400"
                          : "text-gray-300"
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-4">
                <label className="block font-semibold mb-2 text-gray-700">
                  Comment
                </label>
                <textarea
                  value={newReview.comment}
                  onChange={(e) =>
                    setNewReview({ ...newReview, comment: e.target.value })
                  }
                  className="w-full p-4 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0770ad]"
                  rows="3"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-6 py-3 bg-[#0770ad] text-white rounded-xl font-bold hover:bg-[#055a8c] transition disabled:opacity-50"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}
          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div
                  key={r.review_id || Math.random()}
                  className="bg-gray-50 rounded-xl p-6"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-[#0770ad] text-white rounded-full flex items-center justify-center font-bold">
                      {r.username?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div>
                      <p className="font-bold">{r.username || "Anonymous"}</p>
                      <div className="flex text-yellow-400">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < r.rating ? "fill-current" : "text-gray-300"
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-700">{r.comment}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              No reviews yet.
            </div>
          )}
        </div>

        {similarBooks.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Similar Books</h2>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {similarBooks.map((b) => (
                <BookCard key={b.id || b.book_id} book={b} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookDetail;
