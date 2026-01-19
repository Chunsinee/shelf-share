import axios from "../api/axios";

const api = {

  login: async (email, password) => {
    const res = await axios.post("/users/login", { email, password });
    return res.data;
  },

  register: async (username, email, password) => {
    const res = await axios.post("/users/register", { username, email, password });
    return res.data;
  },

  updateProfile: async (data) => {
    const res = await axios.put("/users/profile", data);
    return res.data;
  },

  changePassword: async (data) => {
    const res = await axios.put("/users/change-password", data);
    return res.data;
  },

  getCategories: async () => {
    try {
      const res = await axios.get("/categories");
      return res.data;
    } catch (e) {
      console.error("❌ getCategories error:", e);
      return [];
    }
  },



  getBooks: async (query = null) => {
    try {

      const endpoint = query?.trim()
        ? `/books/search?query=${encodeURIComponent(query.trim())}`
        : `/books/search`;

      const res = await axios.get(endpoint);
      return res.data.map((book) => ({
        ...book,
        id: book.book_id || book.google_id || book.id,
        category: book.category_name || book.category || "General",
        cover_image: book.cover_image || "/img/book-placeholder.png",
        rating: parseFloat(book.avg_rating || 0),
        borrow_count: parseInt(book.borrow_count || 0),
        queue_count: parseInt(book.queue_count || 0),
        review_count: parseInt(book.review_count || 0),
      }));
    } catch (e) {
      console.error("❌ getBooks error:", e);
      return [];
    }
  },

  getBookById: async (id) => {
    const res = await axios.get(`/books/${id}`);
    return {
      ...res.data,
      id: res.data.book_id || res.data.google_id || res.data.id,
      category: res.data.category_name || res.data.category || "General",
      queue_count: parseInt(res.data.queue_count || 0),
      borrow_count: parseInt(res.data.borrow_count || 0),
      avg_rating: parseFloat(res.data.avg_rating || 0),
    };
  },

  getBorrowedBooks: async () => {
    try {
      const res = await axios.get("/loans/my-loans");
      return res.data;
    } catch (e) {
      console.error("❌ getBorrowedBooks error:", e);
      return [];
    }
  },

  borrowBook: async (bookId, hours = 168) => {
    const res = await axios.post("/loans", { book_id: bookId, hours });
    return res.data;
  },

  returnBook: async (bookId) => {
    const res = await axios.post("/loans/return", { book_id: bookId });
    return res.data;
  },

  createReservation: async (bookId, preferredHours = 168) => {
    const res = await axios.post("/reservations", {
      book_id: bookId,
      preferred_hours: preferredHours,
    });
    return res.data;
  },

  getMyReservations: async () => {
    try {
      const res = await axios.get("/reservations/my-reservations");
      return res.data;
    } catch (e) {
      console.error("❌ getMyReservations error:", e);
      return [];
    }
  },

  cancelReservation: async (id) => {
    const res = await axios.delete(`/reservations/${id}`);
    return res.data;
  },


  getBookReviews: async (id) => {
    try {
      const res = await axios.get(`/reviews/${id}`);
      return res.data;
    } catch (e) {
      console.error("❌ getBookReviews error:", e);
      return [];
    }
  },

  addReview: async (bookId, rating, comment) => {
    const res = await axios.post("/reviews", { book_id: bookId, rating, comment });
    return res.data;
  },

  getSuggestions: async (query) => {
    if (!query || query.trim().length < 2) return [];
    try {
      const res = await axios.get(`/books/suggest?query=${encodeURIComponent(query.trim())}`);
      return res.data;
    } catch (e) {
      console.error("❌ getSuggestions error:", e);
      return [];
    }
  },

  subscribeNewsletter: async (email) => {
    const res = await axios.post("/users/subscribe-newsletter", { email });
    return res.data;
  },

  addFavorite: async (book) => {

    const res = await axios.post("/favorites", { book });
    return res.data;
  },

  removeFavorite: async (id) => {

    const res = await axios.delete(`/favorites/${id}`);
    return res.data;
  },

  getMyFavorites: async () => {
    try {
      const res = await axios.get("/favorites");
      return res.data;
    } catch (e) {
      console.error("❌ getMyFavorites error:", e);
      return [];
    }
  }
};

export default api;