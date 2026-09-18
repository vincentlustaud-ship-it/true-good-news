import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Link, Route, Routes, useLocation } from "react-router";
import { LangProvider, useLang } from "./lib/lang.tsx";
import { Header, Footer } from "./components/Chrome.tsx";
import Today from "./pages/Today.tsx";
import Archive from "./pages/Archive.tsx";
import Abonnement from "./pages/Abonnement.tsx";
import { Charte, Verification, Confidentialite } from "./pages/Text.tsx";
import "./app.css";

const Admin = lazy(() => import("./pages/Admin.tsx"));

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function NotFound() {
  const { t } = useLang();
  return <div className="prose"><h1>404</h1><p>{t.notFound}</p><p><Link to="/">{t.backHome}</Link></p></div>;
}

function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page">
      <Header />
      <main style={{ display: "contents" }}>{children}</main>
      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <LangProvider>
      <BrowserRouter>
        <ScrollTop />
        <Routes>
          <Route path="/admin/*" element={<Suspense fallback={null}><Admin /></Suspense>} />
          <Route path="*" element={
            <PublicLayout>
              <Routes>
                <Route path="/" element={<Today />} />
                <Route path="/archive" element={<Archive />} />
                <Route path="/archive/:date" element={<Archive />} />
                <Route path="/verification" element={<Verification />} />
                <Route path="/charte" element={<Charte />} />
                <Route path="/confidentialite" element={<Confidentialite />} />
                <Route path="/abonnement" element={<Abonnement />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </PublicLayout>
          } />
        </Routes>
      </BrowserRouter>
    </LangProvider>
  );
}
