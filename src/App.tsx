import { useEffect } from "react";
import { Routes, Route, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";
import { AppProvider, useAppSettings } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import LibraryPage from "@/pages/LibraryPage";
import TrainingPage from "@/pages/TrainingPage";
import StatsPage from "@/pages/StatsPage";
import ProfilePage from "@/pages/ProfilePage";
import MistakesPage from "@/pages/MistakesPage";
import RecordsPage from "@/pages/RecordsPage";
import AdminPage from "@/pages/AdminPage";
import Login from "@/pages/Login";
import { useAuth } from "@/hooks/useAuth";

/* ── Theme Manager ───────────────────────────── */
function ThemeManager() {
  const { settings } = useAppSettings();

  useEffect(() => {
    const apply = () => {
      const root = document.documentElement;
      if (settings.theme === "dark") {
        root.classList.add("dark");
      } else if (settings.theme === "light") {
        root.classList.remove("dark");
      } else {
        // system
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        root.classList.toggle("dark", prefersDark);
      }
    };
    apply();

    if (settings.theme === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => apply();
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [settings.theme]);

  return null;
}

/* ── Guards ──────────────────────────────────── */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100dvh", background: "#1a1a1a", color: "#666" }}>
        加载中...
      </div>
    );
  }

  if (!isAuthenticated) return null;
  return <>{children}</>;
}

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center" style={{ minHeight: "100dvh", background: "#1a1a1a", color: "#666" }}>
        加载中...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center gap-3" style={{ minHeight: "100dvh", background: "#1a1a1a", color: "#ef4444", padding: "20px" }}>
        <Shield size={48} />
        <p>权限不足，需要管理员角色</p>
        <button
          onClick={() => navigate("/")}
          className="px-6 py-2.5 rounded-lg font-semibold"
          style={{ background: "#00d4ff", color: "#1a1a1a", border: "none", cursor: "pointer" }}
        >
          返回首页
        </button>
      </div>
    );
  }

  return <>{children}</>;
}

const HIDE_NAV_PATHS = ["/training", "/mistakes"];

function AnimatedRoutes() {
  const location = useLocation();
  const hideNav = HIDE_NAV_PATHS.includes(location.pathname);
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        transition={{ duration: 0.25 }}
      >
        <Routes location={location}>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LibraryPage />} />
          <Route path="/training" element={<TrainingPage />} />
          <Route path="/stats" element={<StatsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/mistakes" element={<MistakesPage />} />
          <Route path="/records" element={<RecordsPage />} />
        </Routes>
      </motion.div>
      {!hideNav && <BottomNav />}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ThemeManager />
      <div
        style={{
          maxWidth: "430px",
          margin: "0 auto",
          minHeight: "100dvh",
          background: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          transition: "background-color 0.3s ease",
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/admin"
            element={
              <AdminGuard>
                <AdminPage />
              </AdminGuard>
            }
          />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <AnimatedRoutes />
              </AuthGuard>
            }
          />
        </Routes>
      </div>
    </AppProvider>
  );
}
