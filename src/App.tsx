import { BrowserRouter, Routes, Route } from "react-router";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Wire from "@/pages/Wire";
import Markets from "@/pages/Markets";
import Hotspots from "@/pages/Hotspots";
import About from "@/pages/About";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="wire" element={<Wire />} />
          <Route path="markets" element={<Markets />} />
          <Route path="hotspots" element={<Hotspots />} />
          <Route path="about" element={<About />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
