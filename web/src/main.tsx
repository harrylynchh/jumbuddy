import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./app.css";
import App from "./App";
import Connect from "./Connect";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<App />} />
        <Route path="/connect" element={<Connect />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);
