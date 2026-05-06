import { useState } from "react";
import { useNavigate } from "react-router";
import { motion } from "framer-motion";
import { trpc } from "@/providers/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Zap, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const loginMutation = trpc.simpleAuth.login.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        navigate("/");
      } else {
        setError(data.error || "登录失败");
      }
    },
    onError: () => {
      setError("登录失败，请检查网络");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
        minHeight: "100vh",
        background: "#1a1a1a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        style={{
          width: "100%",
          maxWidth: "340px",
        }}
      >
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
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
          <h1
            style={{
              fontSize: "24px",
              fontWeight: 700,
              color: "#fff",
              margin: "0 0 6px 0",
            }}
          >
            ZENITH
          </h1>
          <p style={{ fontSize: "14px", color: "#666", margin: 0 }}>
            智能题库训练平台
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <Label
              htmlFor="username"
              style={{ color: "#a0a0a0", fontSize: "13px", marginBottom: "6px", display: "block" }}
            >
              账号
            </Label>
            <Input
              id="username"
              type="text"
              placeholder="输入账号 (1, 2, 3)"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              style={{
                background: "#222",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "#fff",
                borderRadius: "12px",
                height: "48px",
                fontSize: "15px",
              }}
            />
          </div>

          <div style={{ marginBottom: "20px" }}>
            <Label
              htmlFor="password"
              style={{ color: "#a0a0a0", fontSize: "13px", marginBottom: "6px", display: "block" }}
            >
              密码
            </Label>
            <div style={{ position: "relative" }}>
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="输入密码"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                style={{
                  background: "#222",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#fff",
                  borderRadius: "12px",
                  height: "48px",
                  fontSize: "15px",
                  paddingRight: "44px",
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
                  padding: "4px",
                  color: "#666",
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
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

          <Button
            type="submit"
            disabled={loginMutation.isPending}
            style={{
              width: "100%",
              height: "48px",
              borderRadius: "12px",
              background: "#00d4ff",
              color: "#1a1a1a",
              fontSize: "15px",
              fontWeight: 600,
              border: "none",
              cursor: loginMutation.isPending ? "not-allowed" : "pointer",
              opacity: loginMutation.isPending ? 0.7 : 1,
            }}
          >
            {loginMutation.isPending ? "登录中..." : "登录"}
          </Button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "20px",
            fontSize: "12px",
            color: "#555",
          }}
        >
          测试账号: 1 / a &nbsp;·&nbsp; 2 / b &nbsp;·&nbsp; 3 / c
        </p>
      </motion.div>
    </div>
  );
}
