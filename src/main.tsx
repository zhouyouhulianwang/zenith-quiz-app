import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router";
import { TRPCProvider } from "@/providers/trpc";
import { AppProvider } from "@/context/AppContext";
import "./index.css";
import App from "./App";

// Unregister service workers to prevent cache issues
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    for (const reg of regs) {
      reg.unregister();
    }
  }).catch(() => {});
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
