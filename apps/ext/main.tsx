import React from "react";
import { createRoot } from "react-dom/client";

import { QuickPost } from "../../ui/quickpost.tsx";
import "../../ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><QuickPost /></React.StrictMode>,
);
