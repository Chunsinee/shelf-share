import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Book,
  Loader2,
  TrendingUp,
  Award,
  Sparkles,
  RefreshCw,
  X,
  Zap,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import BookCard from "../components/BookCard";
import api from "../services/api";
import Navbar from "../components/Navbar";
import { useBookSections } from "../hooks/useBookSections";

const fixedCategories = [
  "Fiction",
  "Non-Fiction",
  "Technology",
  "Science",
  "History",
  "Business",
  "Art & Design",
  "Biography",
  "Health & Wellness",
  "Travel",
];

const recommendations = [
  { id: "artist", label: "Artist of the Month", icon: Award },
  { id: "year", label: "Book of the Year", icon: Calendar },
  { id: "genre", label: "Top Genre", icon: Zap },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "top_rated", label: "Top Rated", icon: Award },
];

const Home = () => {
  const location = useLocation();

  // Use custom hook for initial data fetching
  const {
    books: initialFetchedBooks,
    loading: initialLoading,
    isFilling,
  } = useBookSections(fixedCategories);

  // Local state for UI filtering
  const [books, setBooks] = useState([]);
  const [initialBooks, setInitialBooks] = useState([]);

  const [selectedCategory, setSelectedCategory] = useState("All Genres");
  const [selectedFilterType, setSelectedFilterType] = useState("category");
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTopGenreCategory, setSelectedTopGenreCategory] =
    useState("All");
  const itemsPerPage = 24;

  const TOP_GENRE_LIMIT = 5;

  // Sync hook data to local state
  useEffect(() => {
    setBooks(initialFetchedBooks);
    setInitialBooks(initialFetchedBooks);
    setLoading(initialLoading);
  }, [initialFetchedBooks, initialLoading]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filter = params.get("filter");

    if (filter) {
      if (fixedCategories.includes(filter)) {
        setSelectedCategory(filter);
        setSelectedFilterType("category");
      } else if (recommendations.some((r) => r.id === filter)) {
        setSelectedCategory(filter);
        setSelectedFilterType("recommendation");
      }
      setIsSearching(false);
      setSearchQuery("");
      setBooks((currentBooks) =>
        initialBooks.length > 0 ? initialBooks : currentBooks,
      );

      setTimeout(() => {
        const mainContent = document.getElementById("main-content");
        if (mainContent) {
          mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 300);
    }
  }, [location.search, initialBooks]);

  useEffect(() => {
    setCurrentPage(1);
    setShowMobileFilters(false);
  }, [
    selectedCategory,
    selectedFilterType,
    searchQuery,
    selectedTopGenreCategory,
  ]);

  const categoryCounts = useMemo(() => {
    const sourceBooks = isSearching ? initialBooks : books;
    const counts = { "All Genres": sourceBooks.length };
    fixedCategories.forEach((cat) => {
      counts[cat] = sourceBooks.filter((b) =>
        (b.category || b.category_name || "")
          .toLowerCase()
          .includes(cat.toLowerCase()),
      ).length;
    });
    return counts;
  }, [books, initialBooks, isSearching]);

  const topGenreStats = useMemo(() => {
    const sourceBooks = initialBooks.length > 0 ? initialBooks : books;
    const stats = {};

    fixedCategories.forEach((cat) => {
      stats[cat] = { books: [], totalBorrows: 0, totalRating: 0, count: 0 };
    });

    sourceBooks.forEach((book) => {
      const bookCat = (book.category || book.category_name || "").toLowerCase();

      for (const cat of fixedCategories) {
        if (bookCat.includes(cat.toLowerCase())) {
          stats[cat].books.push(book);
          stats[cat].totalBorrows += parseInt(book.borrow_count) || 0;
          stats[cat].totalRating += parseFloat(book.avg_rating) || 0;
          stats[cat].count += 1;
          break;
        }
      }
    });

    Object.keys(stats).forEach((cat) => {
      const data = stats[cat];
      data.books.sort(
        (a, b) =>
          (parseInt(b.borrow_count) || 0) - (parseInt(a.borrow_count) || 0),
      );
      data.books = data.books.slice(0, TOP_GENRE_LIMIT);
      data.avgRating =
        data.count > 0 ? (data.totalRating / data.count).toFixed(1) : 0;
    });

    return stats;
  }, [books, initialBooks]);

  const filteredBooks = useMemo(() => {
    let result = [...books];

    if (isSearching && searchQuery.trim()) {
      return result;
    }

    if (selectedFilterType === "recommendation") {
      const source = initialBooks.length > 0 ? [...initialBooks] : result;

      switch (selectedCategory) {
        case "trending":
          return source
            .sort(
              (a, b) =>
                (parseInt(b.borrow_count) || 0) -
                (parseInt(a.borrow_count) || 0),
            )
            .slice(0, 20);

        case "top_rated":
          return source
            .sort(
              (a, b) =>
                (parseFloat(b.avg_rating) || 0) -
                (parseFloat(a.avg_rating) || 0),
            )
            .slice(0, 20);

        case "year": {
          const currentYear = new Date().getFullYear();
          return source
            .filter((b) => parseInt(b.published_year) === currentYear)
            .sort(
              (a, b) =>
                (parseFloat(b.avg_rating) || 0) -
                (parseFloat(a.avg_rating) || 0),
            );
        }

        case "genre": {
          if (selectedTopGenreCategory === "All") {
            const allTopBooks = fixedCategories.flatMap(
              (cat) => topGenreStats[cat]?.books || [],
            );
            return allTopBooks;
          } else {
            return topGenreStats[selectedTopGenreCategory]?.books || [];
          }
        }

        case "artist": {
          const authorRatings = {};
          source.forEach((b) => {
            const author = b.author || "Unknown";
            if (!authorRatings[author])
              authorRatings[author] = { total: 0, count: 0, books: [] };
            authorRatings[author].total += parseFloat(b.avg_rating) || 0;
            authorRatings[author].count += 1;
            authorRatings[author].books.push(b);
          });
          const topAuthor = Object.entries(authorRatings)
            .filter(([, data]) => data.count > 0)
            .map(([author, data]) => ({
              author,
              avgRating: data.total / data.count,
              books: data.books,
            }))
            .sort((a, b) => b.avgRating - a.avgRating)[0];
          return topAuthor
            ? topAuthor.books.sort(
                (a, b) =>
                  (parseFloat(b.avg_rating) || 0) -
                  (parseFloat(a.avg_rating) || 0),
              )
            : source;
        }

        default:
          return source;
      }
    }

    if (selectedCategory !== "All Genres") {
      result = result.filter((b) => {
        const cat = b.category || b.category_name || "General";
        return cat.toLowerCase().includes(selectedCategory.toLowerCase());
      });
    }

    return result;
  }, [
    books,
    initialBooks,
    selectedCategory,
    selectedFilterType,
    searchQuery,
    isSearching,
    selectedTopGenreCategory,
    topGenreStats,
  ]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setLoading(true);
    setIsSearching(true);
    setSelectedFilterType("category");
    setSelectedCategory("All Genres");

    try {
      const results = await api.getBooks(searchQuery);
      setBooks(results);
    } catch (err) {
      if (import.meta.env.DEV) {
        console.error("Search failed:", err);
      }
    } finally {
      setLoading(false);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setIsSearching(false);
    setBooks(initialBooks);
  };

  const getDisplayTitle = () => {
    if (isSearching) return "Search Results";
    if (selectedFilterType === "category") return selectedCategory;
    if (selectedCategory === "genre" && selectedTopGenreCategory !== "All") {
      return `Top Genre - ${selectedTopGenreCategory}`;
    }
    const rec = recommendations.find((r) => r.id === selectedCategory);
    return rec ? rec.label : "Books";
  };

  const indexOfLastBook = currentPage * itemsPerPage;
  const indexOfFirstBook = indexOfLastBook - itemsPerPage;
  const currentBooks = filteredBooks.slice(indexOfFirstBook, indexOfLastBook);
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
    const mainContent = document.getElementById("main-content");
    if (mainContent) {
      mainContent.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const CategoryButton = ({ genre }) => {
    const isActive =
      selectedCategory === genre && selectedFilterType === "category";
    const count = categoryCounts[genre] || 0;

    return (
      <button
        onClick={() => {
          setSelectedCategory(genre);
          setSelectedFilterType("category");
          setIsSearching(false);
        }}
        className={`flex items-center justify-between w-full gap-3 text-sm md:text-base font-medium px-4 py-2.5 rounded-xl transition-all ${
          isActive
            ? "bg-[#0770ad]/10 text-[#0770ad] font-bold"
            : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
        }`}
      >
        <span className="truncate text-left">{genre}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            isActive ? "bg-[#0770ad] text-white" : "bg-gray-200 text-gray-600"
          }`}
        >
          {count}
        </span>
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Navbar />

      <section className="relative bg-white overflow-hidden border-b border-gray-100">
        <div className="hidden md:block absolute top-0 right-0 w-[60%] h-[120%] bg-[#0770ad] rounded-bl-[200px] translate-x-20 -translate-y-20 opacity-10 xl:opacity-100 transition-opacity duration-500" />
        <div className="container mx-auto px-6 lg:px-16 relative z-10 pt-10 pb-12 lg:pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="max-w-xl text-center lg:text-left mx-auto lg:mx-0 order-2 lg:order-1 mt-6 lg:mt-0">
              <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
                <Book className="w-6 h-6 text-[#0770ad]" />
                <span className="font-bold text-lg tracking-widest uppercase text-[#0770ad]">
                  SHELFSHARE
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-7xl font-black leading-tight mb-6 text-gray-900">
                Your Personal <span className="text-[#0770ad]">Library</span>
              </h1>
              <p className="text-gray-500 text-base md:text-lg mb-8 font-medium">
                Discover insights and ideas from books across every genre.
              </p>
              <form
                onSubmit={handleSearch}
                className="relative max-w-md mx-auto lg:mx-0 shadow-xl shadow-blue-900/5 rounded-2xl bg-white border border-gray-100"
              >
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="home-book-search"
                  name="homeBookSearch"
                  type="text"
                  placeholder="Search books, authors..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  className="w-full bg-transparent py-4 pl-12 pr-12 rounded-2xl outline-none focus:ring-2 focus:ring-[#0770ad] transition"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </form>
            </div>
            <div className="relative flex justify-center lg:justify-end order-1 lg:order-2">
              <img
                src="/img/reading-student.png"
                alt="Reading"
                className="w-64 sm:w-80 lg:w-full max-w-md object-contain drop-shadow-2xl relative z-10 animate-in fade-in zoom-in duration-700"
                onError={(e) => (e.target.style.display = "none")}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="container mx-auto flex flex-col lg:flex-row gap-0 pt-8 relative">
        <div className="lg:hidden px-6 mb-4 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-800 truncate pr-4">
            {getDisplayTitle()}
          </h2>
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-gray-700 font-bold shadow-sm hover:bg-gray-50 transition"
          >
            <Filter className="w-4 h-4" /> Filters
          </button>
        </div>

        {showMobileFilters && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
            onClick={() => setShowMobileFilters(false)}
          />
        )}

        <aside
          className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:w-1/4 lg:bg-transparent lg:shadow-none lg:z-0 ${
            showMobileFilters
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full overflow-y-auto p-6 lg:p-8 space-y-8 scrollbar-hide">
            <div className="flex justify-between items-center lg:hidden mb-4">
              <h3 className="font-bold text-lg">Filters</h3>
              <button
                onClick={() => setShowMobileFilters(false)}
                className="p-2 bg-gray-100 rounded-full hover:bg-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-xl mb-4 flex items-center gap-2 text-gray-800">
                <Book className="w-5 h-5 text-[#0770ad]" /> Categories
              </h3>
              <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                <CategoryButton genre="All Genres" />
                {fixedCategories.map((genre) => (
                  <CategoryButton key={genre} genre={genre} />
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
              <h3 className="font-bold text-xl mb-4 text-gray-800 flex items-center gap-2">
                Discover
              </h3>
              <ul className="space-y-2">
                {recommendations.map(({ id, label, icon: Icon }) => {
                  const isActive =
                    selectedFilterType === "recommendation" &&
                    selectedCategory === id;
                  return (
                    <li key={id}>
                      <button
                        onClick={() => {
                          setSelectedCategory(id);
                          setSelectedFilterType("recommendation");
                          setIsSearching(false);
                          setShowMobileFilters(false);
                          if (id === "genre")
                            setSelectedTopGenreCategory("All");
                        }}
                        className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all group ${
                          isActive
                            ? "bg-[#0770ad] text-white shadow-md"
                            : "text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            isActive
                              ? "text-white"
                              : "text-gray-400 group-hover:text-[#0770ad]"
                          }`}
                        />
                        <span className="font-medium text-sm">{label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </aside>

        <main
          id="main-content"
          className="flex-1 py-4 lg:py-8 px-6 lg:px-8 min-h-[500px]"
        >
          <div className="hidden lg:flex mb-8 flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-black text-gray-900 flex items-center gap-3">
                {getDisplayTitle()}
                {selectedFilterType === "recommendation" && (
                  <Sparkles className="w-6 h-6 text-yellow-500 animate-pulse" />
                )}
              </h2>
              <p className="text-gray-500 mt-1 font-medium">
                {isSearching
                  ? `Found ${filteredBooks.length} results`
                  : `Showing ${filteredBooks.length} books`}
                {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
              </p>
            </div>
            {(selectedCategory !== "All Genres" || isSearching) && (
              <button
                onClick={() => {
                  setSelectedCategory("All Genres");
                  setSelectedFilterType("category");
                  clearSearch();
                  setSelectedTopGenreCategory("All");
                }}
                className="flex items-center gap-2 text-sm font-bold text-[#0770ad] bg-blue-50 hover:bg-blue-100 px-4 py-2.5 rounded-xl transition-colors self-start"
              >
                <RefreshCw className="w-4 h-4" /> Clear Filters
              </button>
            )}
          </div>

          {selectedFilterType === "recommendation" &&
            selectedCategory === "genre" && (
              <div className="mb-6 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-bold text-lg text-gray-800">
                    Select Genre (Top 5 per category)
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                  <button
                    onClick={() => setSelectedTopGenreCategory("All")}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                      selectedTopGenreCategory === "All"
                        ? "bg-[#0770ad] text-white shadow-md"
                        : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    All Genres
                  </button>
                  {fixedCategories.map((cat) => {
                    const stats = topGenreStats[cat];
                    return (
                      <button
                        key={cat}
                        onClick={() => setSelectedTopGenreCategory(cat)}
                        className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex flex-col items-start ${
                          selectedTopGenreCategory === cat
                            ? "bg-[#0770ad] text-white shadow-md"
                            : "bg-gray-50 text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <span className="truncate w-full text-left">{cat}</span>
                        <span
                          className={`text-[10px] mt-1 ${
                            selectedTopGenreCategory === cat
                              ? "text-blue-100"
                              : "text-gray-500"
                          }`}
                        >
                          {stats.totalBorrows} borrows • ⭐{stats.avgRating}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

          {loading ? (
            <div className="text-center py-20">
              <Loader2 className="w-12 h-12 text-[#0770ad] animate-spin mx-auto mb-4" />
              <p className="text-gray-400">Loading library...</p>
              {isFilling && (
                <p className="text-gray-400 text-sm mt-2">
                  Discovering more books for you...
                </p>
              )}
            </div>
          ) : currentBooks.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentBooks.map((book, index) => (
                  <BookCard
                    key={`${book.book_id || book.id || book.google_id}-${index}`}
                    book={book}
                    rank={
                      selectedFilterType === "recommendation"
                        ? indexOfFirstBook + index + 1
                        : null
                    }
                    showStats={true}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-12 mb-8">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-3 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white shadow-sm"
                  >
                    <ChevronLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <span className="text-gray-500 font-medium text-sm px-4">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-3 rounded-xl border border-gray-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition bg-white shadow-sm"
                  >
                    <ChevronRight className="w-5 h-5 text-gray-600" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
              <Book className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500 text-lg mb-6">
                {isSearching
                  ? `No books found for "${searchQuery}"`
                  : "No books found matching your criteria."}
              </p>
              <button
                onClick={() => {
                  setSelectedCategory("All Genres");
                  setSelectedFilterType("category");
                  clearSearch();
                  setSelectedTopGenreCategory("All");
                }}
                className="mt-6 text-white bg-[#0770ad] px-8 py-3 rounded-xl font-bold hover:shadow-lg transition"
              >
                Browse All Books
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Home;
