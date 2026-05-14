import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsKeyboardOpen(window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.8 : false);
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  // Debug: log API endpoint on mount
  useEffect(() => {
    const apiUrl = (window as any).__API_ENDPOINT__ || "not set";
    console.log("[ZENITH] API Endpoint:", apiUrl);
  }, []);

  const loginMutation = trpc.simpleAuth.login.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "登录失败");
      }
    },
    onError: (err) => {
      console.error("[ZENITH] Login error:", err);
      const apiUrl = (window as any).__API_ENDPOINT__ || "not set";
    },
  });

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }
    loginMutation.mutate({ username: username.trim(), password });
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--page-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: isKeyboardOpen ? "flex-start" : "center",
        padding: "20px",
        paddingTop: isKeyboardOpen ? "40px" : "20px",
        transition: "padding-top 0.3s ease, background 0.3s ease",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{ width: "100%", maxWidth: "420px" }}
      >
        {/* Debug: show API URL */}
        <div style={{ textAlign: "center", marginBottom: "8px", fontSize: "10px", color: "var(--text-tertiary)", wordBreak: "break-all" }}>
        </div>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: isKeyboardOpen ? "16px" : "32px", transition: "margin 0.3s ease" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #00d4ff, #0077ff)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              boxShadow: "0 8px 24px rgba(0,212,255,0.25)",
            }}
          >
            <Zap size={32} color="#fff" />
          </div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px 0" }}>
            ZENITH
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-secondary)", margin: 0 }}>
            智能题库训练平台
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label htmlFor="username" style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "6px", display: "block" }}>
              账号
            </label>
            <input
              id="username"
              type="text"
              inputMode="numeric"
              placeholder="输入账号 (1, 2, 3)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onInput={(e) => setUsername(e.currentTarget.value)}
              autoComplete="username"
              autoFocus
              style={{
                width: "100%",
                boxSizing: "border-box",
                background: "var(--card-bg-secondary)",
                border: "1px solid var(--border-color)",
                color: "var(--text-primary)",
                borderRadius: "12px",
                height: "48px",
                fontSize: "16px",
                padding: "0 14px",
                outline: "none",
                transition: "border-color 0.2s, background 0.3s",
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = "#00d4ff"; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label htmlFor="password" style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "6px", display: "block" }}>
              密码
            </label>
            <div style={{ position: "relative" }}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInput={(e) => setPassword(e.currentTarget.value)}
                autoComplete="current-password"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  background: "var(--card-bg-secondary)",
                  border: "1px solid var(--border-color)",
                  color: "var(--text-primary)",
                  borderRadius: "12px",
                  height: "48px",
                  fontSize: "16px",
                  padding: "0 44px 0 14px",
                  outline: "none",
                  transition: "border-color 0.2s, background 0.3s",
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = "#00d4ff"; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border-color)"; }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px",
                  color: "var(--text-tertiary)",
                  minWidth: "44px",
                  minHeight: "44px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Quick login button */}
          <button
            type="button"
            onClick={() => {
              setUsername("1");
              setPassword("1");
              setTimeout(() => loginMutation.mutate({ username: "1", password: "1" }), 100);
            }}
            style={{
              marginTop: "8px",
              marginBottom: "8px",
              background: "transparent",
              border: "1px dashed var(--border-color)",
              color: "var(--text-tertiary)",
              fontSize: "12px",
              cursor: "pointer",
              width: "100%",
              textAlign: "center",
              padding: "6px",
              borderRadius: "6px",
            }}
          >
            快速登录（测试账号: 1 / 密码: 1）
          </button>

          <AnimatePresence>
            {error && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, y: -10, height: 0 }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#ef4444",
                  overflow: "hidden",
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "12px",
              background: "#00d4ff",
              color: "var(--text-primary)",
              fontSize: "16px",
              fontWeight: 600,
              border: "none",
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              opacity: loginMutation.isPending ? 0.7 : 1,
              transition: "opacity 0.2s, transform 0.15s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {loginMutation.isPending ? "登录中..." : "登录"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "var(--text-tertiary)" }}>
          请输入您的账号和密码登录
        </p>
      </motion.div>
    </div>
  );
}
