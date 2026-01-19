import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Lazy load pages
const Home = lazy(() => import("./pages/Home"));
const AllBooks = lazy(() => import("./pages/AllBooks"));
const BookDetail = lazy(() => import("./pages/BookDetail"));
const BorrowReturn = lazy(() => import("./pages/BorrowReturn"));
const Login = lazy(() => import("./pages/Login"));
const Forgetpass = lazy(() => import("./pages/Forgetpass"));
const Settings = lazy(() => import("./pages/Settings"));
const Favbooks = lazy(() => import("./pages/Favbooks"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));

function App() {
  return (
    <ErrorBoundary>
      <ScrollToTop />
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            zIndex: 9999,
          },
        }}
        containerStyle={{
          zIndex: 99999,
        }}
      />
      <Navbar />
      <main className="pt-[72px]">
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-[50vh]">
              <Loader2 className="w-12 h-12 text-[#0770ad] animate-spin" />
            </div>
          }
        >
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/books" element={<AllBooks />} />
            <Route path="/book/:id" element={<BookDetail />} />
            <Route path="/borrow" element={<BorrowReturn />} />
            <Route path="/login" element={<Login />} />
            <Route path="/favorites" element={<Favbooks />} />
            <Route path="/forgetpass" element={<Forgetpass />} />
            <Route path="/settings" element={<Settings />} />

            <Route path="/register" element={<Navigate to="/login" />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </ErrorBoundary>
  );
}

export default App;
