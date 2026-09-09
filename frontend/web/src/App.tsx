import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DashboardPage, NotFoundPage, WatchlistDetailPage, WatchlistsPage } from "./pages/Pages";
import { ConnectionProvider } from "./state/connection";
import { ToastProvider } from "./state/toast";
export default function App() { return <ToastProvider><ConnectionProvider><BrowserRouter><Routes><Route path="/" element={<DashboardPage />} /><Route path="/dashboard" element={<DashboardPage />} /><Route path="/watchlists" element={<WatchlistsPage />} /><Route path="/watchlists/:watchlistId" element={<WatchlistDetailPage />} /><Route path="*" element={<NotFoundPage />} /></Routes></BrowserRouter></ConnectionProvider></ToastProvider>; }
