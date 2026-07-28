import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { useState, useEffect, useMemo } from "react";

export const trpc = createTRPCReact<AppRouter>();

function getApiUrl(): string {
  // In container deployment (Kimi platform), frontend and backend run on same domain
  // Use relative path for API requests
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
            signal: AbortSignal.timeout(60000),
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
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 0,
        refetchOnWindowFocus: true,
      },
    },
  }));

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
