import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage, NotFoundPage, OrdersPage, WatchlistDetailPage, WatchlistsPage } from "./pages/Pages";
import { LandingPage } from "./pages/Landing";
import { ResultsPage } from "./pages/Results";
import { SignalsPage } from "./pages/Signals";
import { ConnectionProvider } from "./state/connection";
import { ToastProvider } from "./state/toast";
export default function App() { return <ToastProvider><ConnectionProvider><BrowserRouter><Routes><Route path="/" element={<LandingPage />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/orders" element={<OrdersPage />} /><Route path="/watchlists" element={<WatchlistsPage />} /><Route path="/watchlists/:watchlistId" element={<WatchlistDetailPage />} /><Route path="/signals" element={<SignalsPage />} /><Route path="/results" element={<ResultsPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></BrowserRouter></ConnectionProvider></ToastProvider>; }
