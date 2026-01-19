import React, { Suspense, lazy } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Footer from "./components/Footer";
import Navbar from "./components/Navbar";
import { Toaster } from "react-hot-toast";
import ScrollToTop from "./components/ScrollToTop";
import ErrorBoundary from "./components/ErrorBoundary";
import PageTransition from "./components/PageTransition";
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
  const location = useLocation();

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
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route
                path="/"
                element={
                  <PageTransition>
                    <Home />
                  </PageTransition>
                }
              />
              <Route
                path="/books"
                element={
                  <PageTransition>
                    <AllBooks />
                  </PageTransition>
                }
              />
              <Route
                path="/book/:id"
                element={
                  <PageTransition>
                    <BookDetail />
                  </PageTransition>
                }
              />
              <Route
                path="/borrow"
                element={
                  <PageTransition>
                    <BorrowReturn />
                  </PageTransition>
                }
              />
              <Route
                path="/login"
                element={
                  <PageTransition>
                    <Login />
                  </PageTransition>
                }
              />
              <Route
                path="/favorites"
                element={
                  <PageTransition>
                    <Favbooks />
                  </PageTransition>
                }
              />
              <Route
                path="/forgetpass"
                element={
                  <PageTransition>
                    <Forgetpass />
                  </PageTransition>
                }
              />
              <Route
                path="/settings"
                element={
                  <PageTransition>
                    <Settings />
                  </PageTransition>
                }
              />

              <Route path="/register" element={<Navigate to="/login" />} />
              <Route
                path="/reset-password/:token"
                element={
                  <PageTransition>
                    <ResetPassword />
                  </PageTransition>
                }
              />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>

      <Footer />
    </ErrorBoundary>
  );
}

export default App;
