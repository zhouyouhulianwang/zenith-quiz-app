import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Zap, Eye, EyeOff, Settings, ChevronDown, ChevronUp } from "lucide-react";

function getSavedServerUrl(): string {
  try {
    const saved = localStorage.getItem("zenith-server-config");
    if (saved) {
      const config = JSON.parse(saved);
      if (config.apiUrl) return config.apiUrl;
    }
  } catch { /* ignore */ }
  return "";
}

function saveServerUrl(url: string) {
  try {
    if (url.trim()) {
      localStorage.setItem("zenith-server-config", JSON.stringify({ apiUrl: url.trim() }));
    } else {
      localStorage.removeItem("zenith-server-config");
    }
  } catch { /* ignore */ }
}

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [serverUrl, setServerUrl] = useState(getSavedServerUrl());

  useEffect(() => {
    const handleResize = () => {
      setIsKeyboardOpen(window.visualViewport ? window.visualViewport.height < window.innerHeight * 0.8 : false);
    };
    window.visualViewport?.addEventListener("resize", handleResize);
    return () => window.visualViewport?.removeEventListener("resize", handleResize);
  }, []);

  const loginMutation = trpc.simpleAuth.login.useMutation({
    onSuccess: async (data) => {
      if (data.success) {
        window.location.href = "/";
      } else {
        setError(data.error || "登录失败");
      }
    },
    onError: () => {
      setError("登录失败，请检查网络");
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
        style={{ width: "100%", maxWidth: "340px" }}
      >
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

        {/* Server Config */}
        <div style={{ marginTop: "16px" }}>
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            style={{
              width: "100%",
              background: "none",
              border: "none",
              color: "var(--text-tertiary)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              cursor: "pointer",
              padding: "8px",
            }}
          >
            <Settings size={12} />
            服务器设置
            {showServerConfig ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          <AnimatePresence>
            {showServerConfig && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ background: "var(--card-bg-secondary)", borderRadius: "12px", padding: "12px", marginTop: "8px" }}>
                  <label style={{ color: "var(--text-secondary)", fontSize: "12px", marginBottom: "6px", display: "block" }}>
                    后端 API 地址（可选）
                  </label>
                  <input
                    type="text"
                    placeholder="https://xxx.loca.lt/api/trpc"
                    value={serverUrl}
                    onChange={(e) => setServerUrl(e.target.value)}
                    style={{
                      width: "100%",
                      boxSizing: "border-box",
                      background: "var(--card-bg)",
                      border: "1px solid var(--border-color)",
                      color: "var(--text-primary)",
                      borderRadius: "8px",
                      height: "40px",
                      fontSize: "13px",
                      padding: "0 10px",
                      outline: "none",
                      marginBottom: "8px",
                    }}
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={() => { saveServerUrl(serverUrl); setError(""); window.location.reload(); }}
                      style={{
                        flex: 1,
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--accent-color)",
                        color: "#fff",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      保存并刷新
                    </button>
                    <button
                      type="button"
                      onClick={() => { setServerUrl(""); saveServerUrl(""); window.location.reload(); }}
                      style={{
                        flex: 1,
                        height: "36px",
                        borderRadius: "8px",
                        background: "var(--card-bg)",
                        color: "var(--text-secondary)",
                        fontSize: "13px",
                        fontWeight: 500,
                        border: "1px solid var(--border-color)",
                        cursor: "pointer",
                      }}
                    >
                      使用默认
                    </button>
                  </div>
                  <p style={{ fontSize: "11px", color: "var(--text-tertiary)", marginTop: "8px", marginBottom: 0, lineHeight: 1.5 }}>
                    留空表示使用同域默认路径。部署到静态托管时需填写后端地址。
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <p style={{ textAlign: "center", marginTop: "20px", fontSize: "12px", color: "var(--text-tertiary)" }}>
          请输入您的账号和密码登录
        </p>
      </motion.div>
    </div>
  );
}
