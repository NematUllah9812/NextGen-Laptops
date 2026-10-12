// Standalone entry point — plain React Query client and a normal #root
// div (the original artifact used the hosting SDK's spaceQueryClient).
// theme.css is NOT imported here: it is built separately with the
// Tailwind CLI (see build.mjs) and linked from index.html, because
// esbuild does not process Tailwind's @import directives.

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const queryClient = new QueryClient();

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("missing #root element");
}

createRoot(rootEl).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
);
