import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import Index from "./pages/Index.tsx";

const Checkout = lazy(() => import("./pages/Checkout.tsx"));
const Pix = lazy(() => import("./pages/Pix.tsx"));
const NotFound = lazy(() => import("./pages/NotFound.tsx"));

const App = () => (
  <>
    <Toaster />
    <BrowserRouter>
      <Suspense fallback={null}>
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
