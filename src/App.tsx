import { Routes, Route, useLocation } from "react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AppProvider } from "@/context/AppContext";
import BottomNav from "@/components/BottomNav";
import HomePage from "@/pages/HomePage";
import LibraryPage from "@/pages/LibraryPage";
import TrainingPage from "@/pages/TrainingPage";
import StatsPage from "@/pages/StatsPage";
import ProfilePage from "@/pages/ProfilePage";
import MistakesPage from "@/pages/MistakesPage";
import RecordsPage from "@/pages/RecordsPage";
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

function AnimatedRoutes() {
  const location = useLocation();
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
          minHeight: "100vh",
          background: "#1a1a1a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <AuthGuard>
                <AnimatedRoutes />
                <BottomNav />
              </AuthGuard>
            }
          />
        </Routes>
      </div>
    </AppProvider>
  );
}
