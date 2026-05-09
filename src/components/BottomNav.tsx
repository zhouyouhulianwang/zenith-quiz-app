import { useLocation, useNavigate } from "react-router";
import { motion } from "framer-motion";
import { Home, BookOpen, Dumbbell, BarChart3, User } from "lucide-react";

const tabs = [
  { path: "/", icon: Home, label: "首页" },
  { path: "/library", icon: BookOpen, label: "题库" },
  { path: "/training", icon: Dumbbell, label: "训练" },
  { path: "/stats", icon: BarChart3, label: "数据" },
  { path: "/profile", icon: User, label: "我的" },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        height: "64px",
        background: "rgba(26, 26, 26, 0.95)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-around",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {tabs.map((tab) => {
        const isActive = location.pathname === tab.path;
        return (
          <motion.button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "4px",
              padding: "8px 12px",
              background: "none",
              border: "none",
              cursor: "pointer",
              flex: 1,
            }}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div
              animate={isActive ? { scale: [0.8, 1.1, 1] } : { scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <tab.icon size={22} color={isActive ? "#00d4ff" : "var(--text-tertiary)"} strokeWidth={isActive ? 2.5 : 1.5} />
            </motion.div>
            <span style={{
              fontSize: "10px",
              color: isActive ? "#00d4ff" : "var(--text-tertiary)",
              fontWeight: isActive ? 600 : 400,
            }}>
              {tab.label}
            </span>
          </motion.button>
        );
      })}
    </nav>
  );
}
