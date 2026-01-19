import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';

const categorySearchTerms = {
  "Fiction": "fiction novel story",
  "Non-Fiction": "nonfiction biography memoir",
  "Technology": "programming computer software",
  "Science": "science physics biology",
  "History": "history historical war",
  "Business": "business management marketing",
  "Art & Design": "art design painting",
  "Biography": "biography autobiography life",
  "Health & Wellness": "health wellness fitness nutrition",
  "Travel": "travel guide tourism adventure"
};

export const useBookSections = (fixedCategories, booksPerCategory = 10) => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFilling, setIsFilling] = useState(false);
  const mounted = useRef(true);

  const fetchBooks = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Initial Fetch
      const dbBooks = await api.getBooks();
      
      if (mounted.current) {
        setBooks(dbBooks);
        setLoading(false); // Show available books immediately
      }

      // 2. Analyze gaps
      const categoryCounts = {};
      fixedCategories.forEach(cat => {
        categoryCounts[cat] = dbBooks.filter(b => 
          (b.category || b.category_name || "").toLowerCase().includes(cat.toLowerCase())
        ).length;
      });

      const categoriesToFill = fixedCategories.filter(cat => categoryCounts[cat] < booksPerCategory);
      
      if (categoriesToFill.length === 0) return;

      if (mounted.current) setIsFilling(true);

      // 3. Parallel Background Fetch
      const fillPromises = categoriesToFill.map(async (category) => {
        const searchTerm = categorySearchTerms[category];
        if (!searchTerm) return [];

        try {
          const results = await api.getBooks(searchTerm);
          const needed = booksPerCategory - categoryCounts[category];
          
          // Filter duplicates against existing dbBooks AND against each other if needed
          // (Basic filtering here, more robust dedupe in setter)
          return results.map(b => ({ ...b, category, category_name: category })).slice(0, needed);
        } catch (err) {
          console.error(`Failed to fill category ${category}:`, err);
          return [];
        }
      });

      const newBooksGroups = await Promise.all(fillPromises);
      const newBooksFlat = newBooksGroups.flat();

      if (mounted.current && newBooksFlat.length > 0) {
        setBooks(prevBooks => {
          // Deduplicate based on ID or Title+Author
          const existingIds = new Set(prevBooks.map(b => b.book_id || b.id || b.google_id));
          const uniqueNewBooks = newBooksFlat.filter(b => {
             const id = b.book_id || b.id || b.google_id;
             if (existingIds.has(id)) return false;
             // Also check title+author for stricter dedupe
             const isDuplicate = prevBooks.some(existing => 
               existing.title?.toLowerCase() === b.title?.toLowerCase() && 
               existing.author?.toLowerCase() === b.author?.toLowerCase()
             );
             return !isDuplicate;
          });
          
          return [...prevBooks, ...uniqueNewBooks];
        });
      }

    } catch (err) {
      console.error("Failed to load books:", err);
      // Ensure loading is false even on error
      if (mounted.current) setLoading(false);
    } finally {
      if (mounted.current) setIsFilling(false);
    }
  }, [fixedCategories, booksPerCategory]);

  useEffect(() => {
    mounted.current = true;
    fetchBooks();
    return () => { mounted.current = false; };
  }, [fetchBooks]);

  return { books, loading, isFilling, refresh: fetchBooks, setBooks };
};
