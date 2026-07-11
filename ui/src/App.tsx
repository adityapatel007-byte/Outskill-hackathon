import { Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { AppHome } from "./pages/AppHome";
import { ScanDetail } from "./pages/ScanDetail";
import { Share } from "./pages/Share";
import { NotFound } from "./pages/NotFound";
import { CompareHome } from "./pages/CompareHome";
import { CompareResult } from "./pages/CompareResult";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/share/:publicId" element={<Share />} />

      {/* Signed-in only */}
      <Route path="/app" element={<RequireAuth><AppHome /></RequireAuth>} />
      <Route path="/scan/:id" element={<RequireAuth><ScanDetail /></RequireAuth>} />
      <Route path="/compare" element={<RequireAuth><CompareHome /></RequireAuth>} />
      <Route path="/compare/:id" element={<RequireAuth><CompareResult /></RequireAuth>} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
