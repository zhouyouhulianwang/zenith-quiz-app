import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router";
import { TRPCProvider } from "@/providers/trpc";
import { AppProvider } from "@/context/AppContext";
import "./index.css";
import App from "./App";

// Register Service Worker for PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then(() => {})
      .catch(() => {});
  });
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <BrowserRouter>
    <TRPCProvider>
      <AppProvider>
        <App />
      </AppProvider>
    </TRPCProvider>
  </BrowserRouter>
);
