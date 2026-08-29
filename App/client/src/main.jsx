import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import ErrorBoundary from "./component/Errorboundary";
import { FinancialYearProvider } from "./context/FinancialYearContext";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <BrowserRouter>
      <FinancialYearProvider>
        <App />
      </FinancialYearProvider>
    </BrowserRouter>
  </ErrorBoundary>,
);
