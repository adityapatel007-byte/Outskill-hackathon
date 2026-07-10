import { Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { AppHome } from "./pages/AppHome";
import { ScanDetail } from "./pages/ScanDetail";
import { Share } from "./pages/Share";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth" element={<Auth />} />
      <Route path="/app" element={<AppHome />} />
      <Route path="/scan/:id" element={<ScanDetail />} />
      <Route path="/share/:publicId" element={<Share />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
