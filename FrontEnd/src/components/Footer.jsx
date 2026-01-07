import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Send,
  Book,
  Facebook,
  Linkedin,
  Instagram,
  Github,
} from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../services/api";

const Footer = () => {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.subscribeNewsletter(email);
      toast.success(
        response.message ||
          "Successfully subscribed! Check your email for confirmation."
      );
      setEmail("");
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        "Failed to subscribe. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <footer className="relative bg-gradient-to-br from-[#0770ad] to-[#055a8c] text-white overflow-hidden font-sans">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-[100px] -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-[100px] translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 pt-20 pb-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8">
          <div className="lg:col-span-4 space-y-6 text-center lg:text-left flex flex-col items-center lg:items-start">
            <Link to="/" className="inline-flex items-center gap-2 group">
              <div className="bg-white/10 p-2 rounded-xl group-hover:rotate-12 transition-transform duration-500 backdrop-blur-sm border border-white/10">
                <Book className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-white tracking-wide">
                ShelfShare
              </span>
            </Link>
            <p className="text-blue-100 leading-relaxed text-sm max-w-sm">
              Your gateway to endless knowledge. Borrow, share, and discover
              books from a community that loves reading as much as you do.
            </p>
            <div className="flex items-center gap-4 pt-2">
              {[Facebook, Linkedin, Instagram, Github].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className="w-10 h-10 rounded-full bg-white/10 border border-white/10 flex items-center justify-center hover:bg-white hover:text-[#0770ad] transition-all duration-300 group"
                >
                  <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-2 col-span-6 flex flex-col items-center lg:items-start">
            <h4 className="text-white font-bold mb-6 tracking-wide">
              Discover
            </h4>
            <ul className="space-y-4 text-sm flex flex-col items-center lg:items-start">
              {[
                "New Arrivals",
                "Trending Now",
                "Top Rated",
                "Categories",
                "Authors",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to={
                      item === "Trending Now"
                        ? "/?filter=trending"
                        : item === "Top Rated"
                        ? "/?filter=top_rated"
                        : "#"
                    }
                    className="text-blue-100 hover:text-white hover:pl-2 transition-all duration-300 flex items-center gap-1 group"
                  >
                    <span className="hidden lg:block w-0 group-hover:w-1 h-1 bg-white rounded-full transition-all duration-300" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 col-span-6 flex flex-col items-center lg:items-start">
            <h4 className="text-white font-bold mb-6 tracking-wide">Support</h4>
            <ul className="space-y-4 text-sm flex flex-col items-center lg:items-start">
              {[
                "Help Center",
                "Borrowing Rules",
                "Return Policy",
                "Contact Us",
                "FAQs",
              ].map((item) => (
                <li key={item}>
                  <Link
                    to="#"
                    className="text-blue-100 hover:text-white hover:pl-2 transition-all duration-300 flex items-center gap-1 group"
                  >
                    <span className="hidden lg:block w-0 group-hover:w-1 h-1 bg-white rounded-full transition-all duration-300" />
                    {item}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-4 w-full max-w-md mx-auto lg:mx-0 bg-white/10 rounded-3xl p-6 lg:p-8 border border-white/20 backdrop-blur-md relative overflow-hidden group text-center lg:text-left">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-[50px] -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:bg-white/20 transition-all duration-700" />

            <h4 className="text-white font-bold text-lg mb-2 relative z-10">
              Subscribe to our newsletter
            </h4>
            <p className="text-blue-100 text-sm mb-6 relative z-10">
              Get the latest book arrivals and exclusive reading lists delivered
              to your inbox.
            </p>

            <form
              onSubmit={handleSubscribe}
              className="space-y-3 relative z-10"
            >
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-200 group-focus-within:text-white transition-colors" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-white/10 border border-white/30 rounded-xl py-3 pl-12 pr-4 text-white text-sm placeholder:text-blue-100/70 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all backdrop-blur-sm"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-white hover:bg-blue-50 text-[#0770ad] font-bold py-3 rounded-xl transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? "Subscribing..." : "Subscribe"}{" "}
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-blue-100 text-center md:text-left">
          <p>© {new Date().getFullYear()} ShelfShare. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            <Link to="#" className="hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link to="#" className="hover:text-white transition-colors">
              Terms of Service
            </Link>
            <Link to="#" className="hover:text-white transition-colors">
              Cookies
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
