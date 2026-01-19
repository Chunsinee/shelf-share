import React, {
  createContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";
import axios from "../api/axios";
import api from "../services/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user profile if token exists
  const fetchUserProfile = async () => {
    try {
      const res = await axios.get("/users/profile");
      setUser(res.data);
    } catch (err) {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  // 1. Initial Check
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
        await fetchUserProfile();
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      const res = await api.login(email, password);

      if (res.token) {
        localStorage.setItem("token", res.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${res.token}`;
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: "Authentication failed" };
    } catch (err) {
      return {
        success: false,
        message:
          err.response?.data?.message || err.response?.data || "Login failed",
      };
    }
  }, []);

  // Handle user registration and state update
  const register = useCallback(async (username, email, password) => {
    try {
      const res = await api.register(username, email, password);
      if (res.token) {
        localStorage.setItem("token", res.token);
        axios.defaults.headers.common["Authorization"] = `Bearer ${res.token}`;
        setUser(res.user);

        return { success: true, user: res.user };
      }
    } catch (err) {
      return {
        success: false,
        message: err.response?.data || "Register failed",
      };
    }
  }, []);

  // Update user profile and refresh state
  const updateProfile = useCallback(async (profileData) => {
    try {
      const res = await api.updateProfile(profileData);
      if (res.user) {
        setUser(res.user);
        return { success: true, user: res.user };
      }
      return { success: false, message: "Update failed" };
    } catch (err) {
      return { success: false, message: err.response?.data || "Update failed" };
    }
  }, []);

  // Change password
  const changePassword = useCallback(async (currentPassword, newPassword) => {
    try {
      const res = await api.changePassword(currentPassword, newPassword);
      return { success: true, message: res.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data || "Password change failed",
      };
    }
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setUser(null);
    navigate("/login");
  }, [navigate]);

  const value = useMemo(
    () => ({
      user,
      login,
      register,
      logout,
      loading,
      updateProfile,
      changePassword,
    }),
    [user, login, register, logout, loading, updateProfile, changePassword],
  );

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
