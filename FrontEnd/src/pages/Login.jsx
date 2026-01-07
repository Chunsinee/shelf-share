import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import toast from "react-hot-toast";

const Input = ({
  icon: Icon,
  type = "text",
  placeholder,
  value,
  onChange,
  required = true,
  id,
  disabled,
  error,
}) => (
  <div className="relative group">
    <Icon
      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors w-5 h-5 ${
        error
          ? "text-red-500"
          : "text-gray-400 group-focus-within:text-[#0770ad]"
      }`}
    />
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
      className={`w-full bg-gray-50 border rounded-xl px-12 py-4 text-gray-700 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
        error
          ? "border-red-300 focus:ring-red-500/50 focus:border-red-500"
          : "border-gray-100 focus:ring-[#0770ad]/50 focus:border-[#0770ad]"
      }`}
    />
  </div>
);

const PasswordInput = ({
  placeholder,
  value,
  onChange,
  id,
  disabled,
  showPw,
  setShowPw,
  error,
}) => (
  <div className="relative group">
    <Lock
      className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors w-5 h-5 ${
        error
          ? "text-red-500"
          : "text-gray-400 group-focus-within:text-[#0770ad]"
      }`}
    />
    <input
      id={id}
      type={showPw ? "text" : "password"}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      required
      disabled={disabled}
      className={`w-full bg-gray-50 border rounded-xl px-12 pr-16 py-4 text-gray-700 focus:outline-none focus:ring-2 transition-all disabled:opacity-50 ${
        error
          ? "border-red-300 focus:ring-red-500/50 focus:border-red-500"
          : "border-gray-100 focus:ring-[#0770ad]/50 focus:border-[#0770ad]"
      }`}
    />
    <button
      type="button"
      onClick={() => setShowPw(!showPw)}
      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#0770ad] transition-colors"
      disabled={disabled}
    >
      {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
    </button>
  </div>
);

const Login = () => {
  const [tab, setTab] = useState("login");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [registerForm, setRegisterForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState({});
  const passwordsMatch = registerForm.password === registerForm.confirmPassword;
  const showPasswordError =
    registerForm.password && registerForm.confirmPassword && !passwordsMatch;

  const handleLogin = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setLoading(true);
    setErrors({});

    console.log("Attempting login...");

    try {
      const result = await login(loginForm.email, loginForm.password);
      console.log("Login result:", result);

      if (!result) {
        throw new Error("No response from login service");
      }

      if (!result.success) {
        const errorMsg =
          typeof result.message === "string"
            ? result.message
            : result.message?.message ||
              "Login failed. Please check your credentials.";

        console.log("Login error:", errorMsg);
        toast.error(errorMsg);
        setLoginForm((prev) => ({ ...prev, password: "" }));
      } else {
        console.log("Login success, navigating...");
        navigate("/");
        setTimeout(() => {
          toast.success(`Welcome back, ${result.user.username}!`);
        }, 100);
      }
    } catch (err) {
      console.error("Login exception:", err);
      toast.error("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!passwordsMatch) {
      toast.error("Passwords do not match");
      return;
    }

    if (registerForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const result = await register(
        registerForm.name,
        registerForm.email,
        registerForm.password
      );

      if (!result.success) {
        const errorMsg =
          typeof result.message === "string"
            ? result.message
            : "Registration failed. Please try again.";
        toast.error(errorMsg);
      } else {
        navigate("/");
        setTimeout(() => {
          toast.success(`Welcome, ${result.user.username}!`);
        }, 100);
      }
    } catch (err) {
      console.error(err);
      toast.error("Unable to connect to server");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-linear-to-br from-[#0770ad] to-[#298dc5] p-6 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-full bg-white/5 rounded-bl-[200px]" />
      <div className="absolute bottom-0 left-0 w-2/5 h-4/5 bg-white/5 rounded-tr-[200px]" />

      <div className="hidden lg:flex flex-col text-white max-w-lg mr-16 z-10">
        <h1 className="text-5xl font-black mb-3">WELCOME BACK!</h1>
        <h3 className="uppercase tracking-wide font-bold mb-4 text-blue-100">
          We're glad to see you again.
        </h3>
        <p className="text-blue-100 leading-relaxed text-lg">
          {tab === "login"
            ? "To keep connected with us please login with your personal info."
            : "Join us today and start your reading journey!"}
        </p>
      </div>

      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl p-10 z-10">
        <div className="flex justify-center mb-8 bg-gray-100 p-1 rounded-full w-fit mx-auto">
          {["login", "register"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setErrors({});
              }}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${
                tab === t
                  ? "bg-white text-[#0770ad] shadow-sm"
                  : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {tab === "login" && (
          <form className="space-y-6" onSubmit={handleLogin}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Sign In</h2>
              <p className="text-gray-400 text-sm">Use your email account</p>
            </div>

            <Input
              icon={Mail}
              type="email"
              placeholder="Email"
              value={loginForm.email}
              onChange={(e) => {
                setLoginForm({ ...loginForm, email: e.target.value });
                setErrors({});
              }}
              id="login-email"
              disabled={loading}
              error={errors.field === "email" || errors.field === "both"}
            />

            <PasswordInput
              placeholder="Password"
              value={loginForm.password}
              onChange={(e) => {
                setLoginForm({ ...loginForm, password: e.target.value });
                setErrors({});
              }}
              id="login-password"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={errors.field === "password" || errors.field === "both"}
            />

            <div className="flex justify-between text-sm items-center">
              <label className="flex items-center gap-2 text-gray-500 cursor-pointer hover:text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#0770ad] rounded border-gray-300"
                />
                Remember me
              </label>
              <Link
                to="/forgetpass"
                className="text-[#0770ad] font-bold hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing In...
                </>
              ) : (
                "SIGN IN"
              )}
            </button>
          </form>
        )}

        {tab === "register" && (
          <form className="space-y-5" onSubmit={handleRegister}>
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">
                Create Account
              </h2>
              <p className="text-gray-400 text-sm">
                Use your email for registration
              </p>
            </div>

            <Input
              icon={User}
              placeholder="Username"
              value={registerForm.name}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, name: e.target.value });
                setErrors({});
              }}
              id="register-name"
              disabled={loading}
              error={errors.field === "name" || errors.field === "all"}
            />

            <Input
              icon={Mail}
              type="email"
              placeholder="Email"
              value={registerForm.email}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, email: e.target.value });
                setErrors({});
              }}
              id="register-email"
              disabled={loading}
              error={errors.field === "email" || errors.field === "all"}
            />

            <PasswordInput
              placeholder="Password"
              value={registerForm.password}
              onChange={(e) => {
                setRegisterForm({ ...registerForm, password: e.target.value });
                setErrors({});
              }}
              id="reg-pass"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={errors.field === "password" || errors.field === "all"}
            />

            <PasswordInput
              placeholder="Confirm Password"
              value={registerForm.confirmPassword}
              onChange={(e) => {
                setRegisterForm({
                  ...registerForm,
                  confirmPassword: e.target.value,
                });
                setErrors({});
              }}
              id="reg-pass2"
              disabled={loading}
              showPw={showPw}
              setShowPw={setShowPw}
              error={
                showPasswordError ||
                errors.field === "password" ||
                errors.field === "all"
              }
            />

            {showPasswordError && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">
                  Passwords do not match
                </p>
              </div>
            )}

            {registerForm.password && passwordsMatch && !errors.register && (
              <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                <p className="text-green-700 text-sm font-medium">
                  ✓ Passwords match
                </p>
              </div>
            )}

            {errors.register && (
              <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 text-sm font-medium">
                  {errors.register}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || showPasswordError}
              className="w-full bg-[#0770ad] hover:bg-[#055a8c] text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all transform hover:-translate-y-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "SIGN UP"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-xs text-gray-500">
          By continuing, you agree to our{" "}
          <a href="#" className="text-[#0770ad] hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="text-[#0770ad] hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
};

export default Login;
