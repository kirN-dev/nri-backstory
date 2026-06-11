import { useEffect } from "react";
import { HashRouter, Route, Routes } from "react-router-dom";
import { useContentStore } from "./store/contentStore";
import Home from "./pages/Home";
import CreateWizard from "./pages/CreateWizard";
import Report from "./pages/Report";
import Admin from "./pages/Admin";

export default function App() {
  const { content, loading, error, load } = useContentStore();

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <h1 className="text-xl font-bold text-red-400">Ошибка контента</h1>
        <p className="mt-3 text-stone-300">{error}</p>
      </main>
    );
  }
  if (loading || !content) {
    return <main className="px-4 py-16 text-center text-stone-400">Загрузка…</main>;
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create/:id" element={<CreateWizard />} />
        <Route path="/report/:id" element={<Report />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </HashRouter>
  );
}
