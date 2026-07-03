"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  GraduationCap,
  LogOut,
  Send,
  Sparkles,
  AlertCircle,
  Settings,
  Key,
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  User,
  Loader2,
  Lock,
  ChevronRight,
  BookOpen
} from "lucide-react";
import { googleSignIn, initAuth, logout } from "@/lib/firebase";
import { MathText } from "@/components/MathText";

interface Message {
  id: string;
  role: "user" | "model";
  text: string;
  timestamp: Date;
}

export default function Page() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [grade, setGrade] = useState("Lớp 10");
  const [userApiKey, setUserApiKey] = useState("");
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleUser, setGoogleUser] = useState<any>(null);

  // UI state
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [authError, setAuthError] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(null);
  const [sheetSuccess, setSheetSuccess] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize Auth state from localStorage
  useEffect(() => {
    const savedEmail = localStorage.getItem("tutor_email");
    const savedPhone = localStorage.getItem("tutor_phone");
    const savedGrade = localStorage.getItem("tutor_grade");
    const savedApiKey = localStorage.getItem("tutor_api_key");
    const savedLoggedIn = localStorage.getItem("tutor_is_logged_in") === "true";

    if (savedEmail) setEmail(savedEmail);
    if (savedPhone) setPhone(savedPhone);
    if (savedGrade) setGrade(savedGrade);
    if (savedApiKey) setUserApiKey(savedApiKey);
    if (savedLoggedIn && savedEmail && savedApiKey) {
      setIsLoggedIn(true);
    }

    // Try initializing Firebase Auth state
    try {
      initAuth(
        (user, token) => {
          setGoogleUser(user);
          setGoogleAccessToken(token);
          if (!savedEmail) setEmail(user.email || "");
        },
        () => {
          // Token expired or not logged in yet
        }
      );
    } catch (e) {
      console.warn("Firebase Auth listener inactive:", e);
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isSending]);

  // Handle Google Login Popup
  const handleGoogleSignIn = async () => {
    setAuthError("");
    setIsLoggingIn(true);
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
        setEmail(result.user.email || "");
        setAuthError("");
      }
    } catch (error: any) {
      console.error("Lỗi đăng nhập Google:", error);
      setAuthError(
        "Đăng nhập bằng tài khoản Google thất bại. Bạn có thể tự nhập Gmail và các thông tin khác vào form bên dưới để tiếp tục học tập ngay!"
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Login Form Submit
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");

    if (!email) {
      setAuthError("Vui lòng nhập Email của bạn.");
      return;
    }
    if (!phone) {
      setAuthError("Vui lòng nhập Số điện thoại của bạn.");
      return;
    }
    if (!userApiKey) {
      setAuthError("Vui lòng cung cấp Gemini API Key của bạn để sử dụng gia sư ảo.");
      return;
    }

    setIsSaving(true);
    setSheetSuccess(false);

    try {
      // If we have a Google Access Token, save to Google Sheet on their Drive
      if (googleAccessToken) {
        try {
          const res = await fetch("/api/sheet/save", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email,
              phone,
              grade,
              accessToken: googleAccessToken,
            }),
          });

          const sheetData = await res.json();
          if (res.ok && sheetData.success) {
            setSheetUrl(sheetData.spreadsheetUrl);
            setSheetSuccess(true);
          } else {
            console.warn("Lỗi lưu Sheet:", sheetData.error);
          }
        } catch (sheetErr) {
          console.error("Không lưu được vào Google Sheets:", sheetErr);
        }
      }

      // Save to localStorage
      localStorage.setItem("tutor_email", email);
      localStorage.setItem("tutor_phone", phone);
      localStorage.setItem("tutor_grade", grade);
      localStorage.setItem("tutor_api_key", userApiKey);
      localStorage.setItem("tutor_is_logged_in", "true");

      setIsLoggedIn(true);

      // Add a friendly greeting message from AI Tutor if chat is empty
      if (messages.length === 0) {
        setMessages([
          {
            id: "greeting",
            role: "model",
            text: `Xin chào bạn học sinh lớp ${grade}! Mình là **Gia sư ảo AI**, người bạn đồng hành thông minh sẽ cùng học tập với bạn. 

Bạn đang có câu hỏi hay bài tập Toán học/Môn học nào cần mình hỗ trợ giải đáp không? Hãy nhập câu hỏi xuống dưới nhé! Mình giải thích rất chi tiết và sẽ dùng ký hiệu công thức đẹp đẽ để bạn dễ hiểu nhất. ✨`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err: any) {
      setAuthError("Có lỗi xảy ra khi thiết lập hồ sơ học tập.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Send Message
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessageText = input;
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        role: "user",
        text: userMessageText,
        timestamp: new Date(),
      },
    ]);

    setIsSending(true);

    try {
      // Build chat history excluding the greeting
      const chatHistory = messages
        .filter((msg) => msg.id !== "greeting")
        .map((msg) => ({
          role: msg.role,
          text: msg.text,
        }));

      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: userMessageText,
          userApiKey,
          grade,
          chatHistory,
        }),
      });

      const data = await res.json();

      if (res.ok && data.text) {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: "model",
            text: data.text,
            timestamp: new Date(),
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            role: "model",
            text: `🔴 **Lỗi hệ thống:** ${data.error || "Không thể tải câu trả lời."}`,
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: "🔴 **Lỗi mạng:** Không thể kết nối tới máy chủ. Vui lòng thử lại.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  // Logout
  const handleLogoutClick = async () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
    if (!confirmed) return;

    try {
      await logout();
    } catch (e) {
      console.error(e);
    }

    localStorage.removeItem("tutor_email");
    localStorage.removeItem("tutor_phone");
    localStorage.removeItem("tutor_grade");
    localStorage.removeItem("tutor_api_key");
    localStorage.removeItem("tutor_is_logged_in");

    setEmail("");
    setPhone("");
    setGoogleAccessToken(null);
    setGoogleUser(null);
    setIsLoggedIn(false);
    setMessages([]);
    setSheetUrl(null);
    setSheetSuccess(false);
  };

  // Update configuration in Modal
  const handleUpdateConfig = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("tutor_grade", grade);
    localStorage.setItem("tutor_api_key", userApiKey);
    setShowSettings(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-slate-800">
      <AnimatePresence mode="wait">
        {!isLoggedIn ? (
          // LOGIN PAGE VIEW
          <motion.main
            key="login-page"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.4 }}
            className="flex-1 flex flex-col items-center justify-center p-4 max-w-lg mx-auto w-full my-6"
            id="login-view-container"
          >
            {/* Logo / Header */}
            <div className="text-center mb-8">
              <div className="inline-flex p-3.5 bg-emerald-100 text-emerald-600 rounded-2xl shadow-sm mb-4">
                <GraduationCap className="w-9 h-9" />
              </div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Gia sư Học tập AI
              </h1>
              <p className="text-slate-500 mt-2 text-sm max-w-sm mx-auto">
                Người bạn đồng hành ảo thông minh giúp bạn tiếp thu kiến thức và giải đáp mọi thắc mắc học tập hiệu quả.
              </p>
            </div>

            {/* Login Container */}
            <div className="w-full bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-100/50 p-6 md:p-8">
              <h2 className="text-lg font-bold text-slate-900 mb-5 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-emerald-500" />
                Hồ sơ học tập
              </h2>

              {/* Step 1: Google login to get permissions for Sheets */}
              <div className="mb-6 pb-6 border-b border-dashed border-slate-100">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                  Bước 1: Kết nối tài khoản Google
                </p>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                  Đăng nhập Google giúp hệ thống xin quyền lưu dữ liệu tiến trình học của bạn vào một file Google Sheet trên chính Drive của bạn.
                </p>

                {googleUser ? (
                  <div className="flex items-center justify-between p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        {googleUser.email?.[0].toUpperCase()}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-bold text-emerald-800 leading-tight">Đã kết nối Google</p>
                        <p className="text-xs text-emerald-600 truncate">{googleUser.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setGoogleUser(null);
                        setGoogleAccessToken(null);
                      }}
                      className="text-xs text-slate-500 hover:text-red-500 font-medium px-2 py-1 hover:bg-white rounded-lg transition"
                    >
                      Hủy kết nối
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    disabled={isLoggingIn}
                    className="w-full flex items-center justify-center gap-3 py-3 border border-slate-200 hover:border-slate-300 rounded-2xl bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 active:bg-slate-100 transition shadow-sm relative group cursor-pointer"
                  >
                    {isLoggingIn ? (
                      <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                    ) : (
                      <>
                        <svg className="w-5 h-5" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                          <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                          <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                          <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                          <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                        </svg>
                        <span>Đăng nhập với Google</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Form Info */}
              <form onSubmit={handleFormSubmit} className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
                    Bước 2: Thông tin cá nhân & API Key
                  </p>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Gmail liên hệ
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Mail className="w-4 h-4" />
                    </span>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ten_cua_ban@gmail.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Số điện thoại
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                      <Phone className="w-4 h-4" />
                    </span>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xx xxx xxx"
                      className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                      Chọn lớp học
                    </label>
                    <select
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition cursor-pointer"
                    >
                      {Array.from({ length: 12 }, (_, i) => `Lớp ${i + 1}`).map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-amber-500" />
                      Gemini API Key
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                        <Key className="w-4 h-4" />
                      </span>
                      <input
                        type="password"
                        required
                        value={userApiKey}
                        onChange={(e) => setUserApiKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full pl-10 pr-4 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition"
                      />
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-slate-400 leading-normal pt-1 flex gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Cam kết bảo mật:</strong> API Key được lưu trực tiếp trên thiết bị của bạn (localStorage) và chỉ gửi từ máy chủ để gọi mô hình Gemini, hoàn toàn không được lưu trữ tại bất kỳ bên nào khác.
                  </span>
                </p>

                {authError && (
                  <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <p className="text-xs text-rose-700 leading-normal">{authError}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-2xl transition shadow-md shadow-emerald-600/10 hover:shadow-emerald-600/20 active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-80"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Đang xử lý thiết lập...</span>
                    </>
                  ) : (
                    <>
                      <span>Bắt đầu học ngay</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </motion.main>
        ) : (
          // MAIN APP / TUTOR CHAT VIEW
          <motion.div
            key="chat-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="flex-1 flex flex-col h-screen overflow-hidden"
          >
            {/* Header */}
            <header className="bg-white border-b border-slate-100 px-4 md:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-sm shadow-slate-100/30">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-slate-900 leading-tight">
                    Gia sư Học tập AI
                  </h1>
                  <p className="text-[10.5px] text-slate-400 font-medium">
                    Học sinh {grade} • {email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {sheetSuccess && sheetUrl && (
                  <a
                    href={sheetUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="hidden sm:inline-flex items-center gap-1.5 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 rounded-lg px-2.5 py-1.5 hover:bg-emerald-100 transition"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    Mở Google Sheet của bạn
                  </a>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="p-2 bg-slate-50 border border-slate-100 hover:bg-slate-100 text-slate-600 rounded-xl transition cursor-pointer"
                  title="Cài đặt gia sư"
                >
                  <Settings className="w-4.5 h-4.5" />
                </button>
                <button
                  onClick={handleLogoutClick}
                  className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition cursor-pointer"
                  title="Đăng xuất"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            </header>

            {/* Chat Workspace */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 max-w-4xl w-full mx-auto">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-4 shadow-sm ${
                        msg.role === "user"
                          ? "bg-emerald-600 text-white rounded-br-none"
                          : "bg-white border border-slate-100 text-slate-800 rounded-bl-none"
                      }`}
                    >
                      {msg.role === "model" ? (
                        <div className="text-sm leading-relaxed prose prose-emerald prose-sm max-w-none">
                          <MathText text={msg.text} />
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isSending && (
                <div className="flex justify-start">
                  <div className="bg-white border border-slate-100 text-slate-500 rounded-2xl rounded-bl-none p-4 max-w-[85%] flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
                    <span className="text-xs font-medium">Gia sư đang phân tích và soạn câu trả lời...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="bg-white border-t border-slate-100 p-4 shrink-0 shadow-lg shadow-slate-100/50">
              <form
                onSubmit={handleSendMessage}
                className="max-w-4xl w-full mx-auto flex gap-2 relative items-center"
              >
                <input
                  type="text"
                  required
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Hỏi gia sư câu hỏi lớp ${grade} của bạn tại đây...`}
                  className="flex-1 border border-slate-200 focus:border-emerald-500 outline-none rounded-2xl pl-4 pr-14 py-3 text-sm bg-slate-50 focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isSending}
                  className="absolute right-2 p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white rounded-xl transition cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />

            {/* Content */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-2xl p-6 border border-slate-100 relative shadow-2xl z-10"
            >
              <h3 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5 text-emerald-500" />
                Cài đặt gia sư ảo
              </h3>

              <form onSubmit={handleUpdateConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Cập nhật lớp học
                  </label>
                  <select
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition"
                  >
                    {Array.from({ length: 12 }, (_, i) => `Lớp ${i + 1}`).map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-amber-500" />
                    Cập nhật Gemini API Key của bạn
                  </label>
                  <input
                    type="password"
                    required
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3 py-2.5 text-sm bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl outline-none transition"
                  />
                </div>

                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowSettings(false)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 font-medium text-xs rounded-xl hover:bg-slate-50 transition"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs rounded-xl transition shadow-md shadow-emerald-600/5"
                  >
                    Lưu cấu hình
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
