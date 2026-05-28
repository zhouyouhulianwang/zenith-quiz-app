import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { loginUser } from "@/lib/localApi";
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

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    setError("");
    if (!username.trim() || !password.trim()) {
      setError("请输入账号和密码");
      return;
    }
    const result = loginUser(username.trim(), password);
    if (result.success) {
      window.location.href = "/#/";
    } else {
      setError(result.error || "登录失败");
    }
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

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "6px", display: "block" }}>
              账号
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="输入账号 (1)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
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
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label style={{ color: "var(--text-secondary)", fontSize: "13px", marginBottom: "6px", display: "block" }}>
              密码
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="输入密码 (a)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
                }}
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
                  color: "var(--text-tertiary)",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: "10px",
                  padding: "10px 14px",
                  marginBottom: "16px",
                  fontSize: "13px",
                  color: "#ef4444",
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "12px",
              background: "#00d4ff",
              color: "#fff",
              fontSize: "16px",
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            登录
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: "24px", fontSize: "12px", color: "var(--text-tertiary)" }}>
          默认账号: 1 / 密码: a
        </p>
      </motion.div>
    </div>
  );
}
