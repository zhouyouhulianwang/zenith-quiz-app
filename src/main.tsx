import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import { TRPCProvider } from "@/providers/trpc";
import { AppProvider } from "@/context/AppContext";
import "./index.css";
import App from "./App";

// Force update Service Worker: unregister old, skip waiting on new
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    // First: unregister all existing service workers
    navigator.serviceWorker.getRegistrations().then((regs) => {
      for (const reg of regs) {
        reg.unregister();
      }
      // After unregister, reload to get fresh content without SW cache
      if (regs.length > 0) {
        window.location.reload();
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <HashRouter>
    <TRPCProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </TRPCProvider>
  </HashRouter>
);
