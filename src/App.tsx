import { Routes, Route, useLocation, useNavigate } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { Shield } from "lucide-react";
import { AppProvider } from "@/context/AppContext";
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

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth({
    redirectOnUnauthenticated: true,
    redirectPath: "/login",
  });

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
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
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a1a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#666",
        }}
      >
        加载中...
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#1a1a1a",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "#ef4444",
          padding: "20px",
          gap: "12px",
        }}
      >
        <Shield size={48} />
        <p>权限不足，需要管理员角色</p>
        <button
          onClick={() => navigate("/")}
          style={{
            padding: "10px 24px",
            borderRadius: "8px",
            background: "#00d4ff",
            color: "#1a1a1a",
            border: "none",
            cursor: "pointer",
            fontWeight: 600,
          }}
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
