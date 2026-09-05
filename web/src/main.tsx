import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@/theme/colors.css";
import "@/theme/tokens.css";
import "@/theme/typography.css";
import "@/theme/base.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);