import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import OwnerReviewDashboard from "./owner/OwnerReviewDashboard";
import "./styles.css";

const RootApp = window.location.pathname.startsWith("/owner") ? OwnerReviewDashboard : App;
createRoot(document.getElementById("root")!).render(<StrictMode><RootApp /></StrictMode>);
