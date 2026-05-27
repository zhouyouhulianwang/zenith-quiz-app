import { createTRPCReact } from "@trpc/react-query";
import { httpBatchLink } from "@trpc/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import superjson from "superjson";
import type { AppRouter } from "../../api/router";
import type { ReactNode } from "react";
import { useState, useEffect, useMemo } from "react";

export const trpc = createTRPCReact<AppRouter>();

function getApiUrl(): string {
  // Use window.location to build the API URL relative to current page
  // This works in both local dev, Kimi Preview, and static deployment
  const base = new URL("/api/trpc", window.location.href).href;
  return base;
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
          }).catch((err) => {
            // Wrap network errors with a friendly message
            if (err instanceof TypeError || err.message?.includes("fetch") || err.message?.includes("Failed to fetch")) {
              throw new Error("网络连接失败，请检查网络或稍后重试");
            }
            throw err;
          });
        },
      }),
    ],
  });
}

export function TRPCProvider({ children }: { children: ReactNode }) {
  const [apiUrl, setApiUrl] = useState(() => getApiUrl());

  // Update API URL if window location changes (e.g., hash routing)
  useEffect(() => {
    const newUrl = getApiUrl();
    if (newUrl !== apiUrl) {
      setApiUrl(newUrl);
    }
  }, [window.location.pathname, window.location.host]);

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
