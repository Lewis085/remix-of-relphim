import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";
import Checkout from "./pages/Checkout.tsx";

const Pix = lazy(() => import("./pages/Pix.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

// Prefetch Pix chunk — starts downloading after main bundle loads
// so it's ready when the user finishes checkout
if (typeof window !== "undefined") {
  window.addEventListener("load", () => {
    setTimeout(() => import("./pages/Pix.tsx"), 2000);
  }, { once: true });
}

const Loading = () => (
  <div className="flex min-h-screen items-center justify-center section-soft">
    <span className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
  </div>
);

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/pix" element={<Pix />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </>
);

export default App;
