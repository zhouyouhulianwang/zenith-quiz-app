import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { useState, useEffect, useMemo } from "react";

export const trpc = createTRPCReact<AppRouter>();

// Hardcoded API endpoint for static deployment
// Update this when tunnel URL changes
const HARDCODED_API_URL = "https://initial-earth-ranked-camp.trycloudflare.com";

function getApiUrl(): string {
  // For non-localhost: always use hardcoded API URL (avoids cached HTML issues)
  if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
    // Check if window.__API_ENDPOINT__ matches our hardcoded URL (new deployment)
    const configuredApi = (window as any).__API_ENDPOINT__;
    if (configuredApi && configuredApi === HARDCODED_API_URL) {
      return configuredApi + "/api/trpc";
    }
    // Ignore stale cached window.__API_ENDPOINT__, use hardcoded
    return HARDCODED_API_URL + "/api/trpc";
  }
  // Localhost: use relative path
  return "/api/trpc";
}

function createTrpcClient(apiUrl: string) {
  return trpc.createClient({
    links: [
      httpBatchLink({
        url: apiUrl,
        transformer: superjson,
        headers() {
          return { "x-trpc-source": "zenith-client" };
        },
        fetch(input, init) {
          return globalThis.fetch(input, {
            ...(init ?? {}),
            credentials: "include",
            mode: "cors",
          });
        },
      }),
    ],
  });
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState(() => getApiUrl());

  // Poll for window.__API_ENDPOINT__ being set by external config script
  useEffect(() => {
    if ((window as any).__API_ENDPOINT__) {
      const newUrl = getApiUrl();
      if (newUrl !== apiUrl) setApiUrl(newUrl);
      return;
    }
    // If not set immediately, wait for it
    const timer = setInterval(() => {
      if ((window as any).__API_ENDPOINT__) {
        setApiUrl(getApiUrl());
        clearInterval(timer);
      }
    }, 50);
    // Fallback: use relative path after 2s
    const fallback = setTimeout(() => {
      clearInterval(timer);
    }, 2000);
    return () => {
      clearInterval(timer);
      clearTimeout(fallback);
    };
  }, []);

  // Recreate client when API URL changes
  const trpcClient = useMemo(() => createTrpcClient(apiUrl), [apiUrl]);
  const [queryClient] = useState(() => new QueryClient());

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
