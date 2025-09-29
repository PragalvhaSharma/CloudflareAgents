import "./styles.css";
import { createRoot } from "react-dom/client";
import App from "./app";
import { Suspense } from "react";
import { Providers } from "@/providers";

const root = createRoot(document.getElementById("app")!);

root.render(
  <Providers>
    <Suspense fallback={<div className="p-4 text-center">Loading…</div>}>
      <div className="bg-neutral-50 text-base text-neutral-900 antialiased transition-colors selection:bg-blue-700 selection:text-white dark:bg-neutral-950 dark:text-neutral-100">
        <App />
      </div>
    </Suspense>
  </Providers>
);
