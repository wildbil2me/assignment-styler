import React from "react";
import { createRoot } from "react-dom/client";

import { Composer } from "../../ui/composer.tsx";
import "../../ui/styles.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode><Composer /></React.StrictMode>,
);
