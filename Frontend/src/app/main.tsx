import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "./providers/ErrorBoundary";
import { QueryProvider } from "./providers/QueryProvider";
import { router } from "./router";
import "./styles/index.css";

const container = document.getElementById("root");
if (!container)
  throw new Error("Root element #root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryProvider>
        <RouterProvider router={router} />
      </QueryProvider>
    </ErrorBoundary>
  </StrictMode>,
);
