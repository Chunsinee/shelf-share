# 📚 ShelfShare

ShelfShare is a library management web application designed to make borrowing and managing books easy and efficient. It features a modern, responsive UI and a robust backend for handling book data, user accounts, and loan transactions.

## 🚀 Features

- **Book Discovery**: Browse and search books by category, author, or title.
- **Smart Categorization**: Automatically categorizes books fetched from Google Books API.
- **Loan Management**: Borrow and return books with automated due date tracking.
- **User Accounts**: Secure login/register system with profile management.
- **Favorites**: Save books to your personal wishlist.
- **Responsive Design**: optimized for both desktop and mobile devices.

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

### 2. Backend Setup
```bash
cd BackEnd
npm install
```

Create a `.env` file in the `BackEnd` directory:
```env
PORT=5000
DB_USER=your_postgres_user
DB_PASSWORD=your_postgres_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=shelfshare
JWT_SECRET=your_jwt_secret_key
GOOGLE_BOOKS_API_KEY=your_google_api_key
```

Run the server:
```bash
npm start
# or for development
npm run dev
```

### 3. Frontend Setup
Open a new terminal:
```bash
cd FrontEnd
npm install
npm run dev
```

## 🔒 Security Note
This project uses environment variables for sensitive data. **Do not commit your `.env` file to GitHub.** The `.gitignore` file is configured to exclude it automatically.

## 📜 License
This project is licensed under the MIT License.
