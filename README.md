# 📚 ShelfShare

ShelfShare is a library management web application designed to make borrowing and managing books easy and efficient. It features a modern, responsive UI and a robust backend for handling book data, user accounts, and loan transactions.

## 🚀 Features

- **Book Discovery**: Browse and search books by category, author, or title.
- **Smart Categorization**: Automatically categorizes books fetched from Google Books API.
- **Loan Management**: Borrow and return books with automated due date tracking.
- **User Accounts**: Secure login/register system with profile management.
- **Favorites**: Save books to your personal wishlist.
- **Responsive Design**: Optimized for both desktop and mobile devices.

## 🛠 Tech Stack (PERN)

- **Frontend**: React (Vite), Tailwind CSS, Lucide React
- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **External API**: Google Books API, Open Library API

## 📦 Installation & Setup

### Prerequisites

- Node.js (v16+)
- PostgreSQL installed and running

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/shelf-share.git
cd shelf-share
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE shelfshare;
\q
```

Run the schema script to create all required tables:

```bash
psql -U postgres -d shelfshare -f BackEnd/schema.sql
```

This will create the following tables:

- `users` - User accounts and authentication
- `books` - Book information from Google Books/Open Library
- `loans` - Borrowing records and due dates
- `favorites` - User's saved books
- `categories` - Book categories (with default categories pre-populated)
- `reservations` - Book reservation system
- `reviews` - Book reviews (optional)

### 3. Backend Setup

```bash
cd BackEnd
npm install
```

Create environment files in the `BackEnd` directory:

**For Development (`.env.local`):**

```env
PORT=5000
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shelfshare
JWT_SECRET=your_jwt_secret_key
GOOGLE_BOOKS_API_KEY=your_google_api_key
RESEND_API_KEY=your_resend_api_key
BASE_URL=http://localhost:5000
```

**For Production (`.env.production`):**
(Same keys as above, but with production credentials)

**Environment Variables Explained:**

- `GOOGLE_BOOKS_API_KEY`: Get from [Google Cloud Console](https://console.cloud.google.com/)
- `RESEND_API_KEY`: Get from [Resend](https://resend.com/) for email functionality (password reset, notifications)
- `JWT_SECRET`: Any random secure string for JWT token encryption

Run the server:

```bash
# Development (loads .env.local)
npm run dev

# Production (loads .env.production)
npm run start:prod
```

### 4. Frontend Setup

Open a new terminal:

```bash
cd FrontEnd
npm install
```

Create a `.env.local` file in the `FrontEnd` directory:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Run the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## 📡 API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `POST /api/auth/forgot-password` - Request password reset

### Books

- `GET /api/books` - Get all books from database
- `GET /api/books/search?query=` - Search books (Google Books + Open Library)
- `GET /api/books/suggest?query=` - Get search suggestions
- `GET /api/books/:id` - Get book details

### Loans

- `GET /api/loans` - Get user's loan history
- `POST /api/loans` - Borrow a book
- `PUT /api/loans/:id/return` - Return a book

### Favorites

- `GET /api/favorites` - Get user's favorites
- `POST /api/favorites` - Add book to favorites
- `DELETE /api/favorites/:id` - Remove from favorites

### Categories

- `GET /api/categories` - Get all categories
- `GET /api/categories/:id/books` - Get books by category

### User Profile

- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update profile
- `PUT /api/users/change-password` - Change password

## 🔒 Security Note

This project uses environment variables for sensitive data. **Do not commit your `.env` file to GitHub.** The `.gitignore` file is configured to exclude it automatically.

## 📜 License

This project is licensed under the MIT License.
