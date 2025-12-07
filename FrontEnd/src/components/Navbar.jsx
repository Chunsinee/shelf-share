import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Menu, X, Settings, ChevronDown, User as UserIcon, BookOpen, Heart, Repeat, LogOut, Sparkles } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isShelfOpen, setIsShelfOpen] = useState(false);

  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const shelfRef = useRef(null);

  const currentPath = location.pathname;
  const isActive = (path) => currentPath === path;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (shelfRef.current && !shelfRef.current.contains(event.target)) {
        setIsShelfOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
    setIsOpen(false);
  };

  const getUserName = () => {
    if (!user) return "Guest";
    if (user.first_name) return user.first_name;
    if (user.firstName) return user.firstName;
    if (user.username) return user.username;
    return user.email?.split('@')[0] || "User";
  };

  return (
    <>
      <nav

        className="fixed top-0 left-0 w-full z-50 transition-all duration-300 bg-white/70 backdrop-blur-md shadow-sm border-b border-white/20 py-4"
      >
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex items-center justify-between">

          <Link to="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl transition-all duration-300 bg-blue-50 text-[#0770ad]">
              <BookOpen className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold tracking-tight transition-colors text-slate-800">
              ShelfShare
            </span>
          </Link>

          <div className="hidden lg:flex items-center gap-2">

            <div className="flex items-center p-1 rounded-full bg-slate-100/50 mr-4">
              <Link
                to="/books"
                className={`px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${isActive("/books")
                  ? "bg-white text-[#0770ad] shadow-sm"
                  : "text-slate-600 hover:text-[#0770ad] hover:bg-white/50"
                  }`}
              >
                Explore
              </Link>

              <div className="relative" ref={shelfRef}>
                <button
                  onClick={() => setIsShelfOpen(!isShelfOpen)}
                  className={`flex items-center gap-1 px-5 py-2 rounded-full text-sm font-medium transition-all duration-300 ${["/favorites", "/borrow"].includes(currentPath)
                    ? "bg-white text-[#0770ad] shadow-sm"
                    : "text-slate-600 hover:text-[#0770ad] hover:bg-white/50"
                    }`}
                >
                  My Shelf
                  <ChevronDown className={`w-4 h-4 transition-transform ${isShelfOpen ? "rotate-180" : ""}`} />
                </button>

                {isShelfOpen && (
                  <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 space-y-1">
                      <Link
                        to="/favorites"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${isActive("/favorites") ? "bg-blue-50 text-[#0770ad] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-[#0770ad]"
                          }`}
                        onClick={() => setIsShelfOpen(false)}
                      >
                        <Heart className="w-4 h-4" /> Favorites
                      </Link>
                      <Link
                        to="/borrow"
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${isActive("/borrow") ? "bg-blue-50 text-[#0770ad] font-medium" : "text-slate-600 hover:bg-slate-50 hover:text-[#0770ad]"
                          }`}
                        onClick={() => setIsShelfOpen(false)}
                      >
                        <Repeat className="w-4 h-4" /> Borrow & Return
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-slate-200/50">
                <div className="flex items-center gap-2 px-1 py-1 pr-4 rounded-full transition-all bg-slate-50">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[#0770ad] shadow-sm">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-slate-700 capitalize truncate max-w-[120px]">
                    {getUserName()}
                  </span>
                </div>

                <Link
                  to="/settings"
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isActive("/settings") ? "bg-blue-100 text-[#0770ad]" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                    }`}
                >
                  <Settings className="w-5 h-5" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"
                  title="Log Out"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                className="ml-2 px-6 py-2.5 rounded-full bg-[#0770ad] text-white font-medium text-sm shadow-lg shadow-blue-500/20 hover:bg-[#055a8c] hover:shadow-blue-500/30 transition-all active:scale-95"
              >
                Log In
              </Link>
            )}
          </div>

          <button
            className="lg:hidden p-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {isOpen && (
        <div className="fixed inset-0 z-[60] bg-white/95 backdrop-blur-xl animate-in fade-in duration-200">
          <div className="p-6 h-full flex flex-col">
            <div className="flex justify-between items-center mb-8">
              <span className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-[#0770ad]" />
                ShelfShare
              </span>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {user && (
                <div className="flex items-center gap-4 mb-8 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                  <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[#0770ad] shadow-md border border-blue-100">
                    <UserIcon className="w-8 h-8" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-500 font-medium">Welcome back,</p>
                    <p className="font-bold text-lg text-slate-900 capitalize">{getUserName()}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Link to="/books" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 p-4 rounded-xl text-lg font-medium transition-all ${isActive("/books") ? "bg-white shadow-sm text-[#0770ad]" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}>
                  <Sparkles className="w-5 h-5" /> Explore Books
                </Link>

                <div className="pt-4 pb-2">
                  <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">My Shelf</p>
                  <Link to="/favorites" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 p-4 rounded-xl text-lg font-medium transition-all ${isActive("/favorites") ? "bg-white shadow-sm text-[#0770ad]" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}>
                    <Heart className="w-5 h-5" /> Favorites
                  </Link>
                  <Link to="/borrow" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 p-4 rounded-xl text-lg font-medium transition-all ${isActive("/borrow") ? "bg-white shadow-sm text-[#0770ad]" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}>
                    <Repeat className="w-5 h-5" /> Borrow & Return
                  </Link>
                </div>

                <div className="pt-2">
                  <p className="px-4 text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Account</p>
                  <Link to="/settings" onClick={() => setIsOpen(false)} className={`flex items-center gap-3 p-4 rounded-xl text-lg font-medium transition-all ${isActive("/settings") ? "bg-white shadow-sm text-[#0770ad]" : "text-slate-600 hover:bg-white hover:shadow-sm"}`}>
                    <Settings className="w-5 h-5" /> Settings
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-slate-100">
              {user ? (
                <button
                  onClick={handleLogout}
                  className="w-full py-4 rounded-xl bg-red-50 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-colors"
                >
                  <LogOut className="w-5 h-5" /> Log Out
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setIsOpen(false)}
                  className="w-full py-4 rounded-xl bg-[#0770ad] text-white font-bold flex items-center justify-center gap-2 hover:bg-[#055a8c] transition-colors shadow-lg shadow-blue-500/20"
                >
                  Log In
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;