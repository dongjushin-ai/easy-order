import {lazy,StrictMode,Suspense,type ComponentType} from "react";
import {createRoot} from "react-dom/client";
import "./styles.css";
const DemoHome=lazy(()=>import("./demo/DemoHome")),Business=lazy(()=>import("./business/BusinessPage")),Kiosk=lazy(()=>import("./App")),Owner=lazy(()=>import("./owner/OwnerReviewDashboard")),Wizard=lazy(()=>import("./onboarding/StoreOnboardingWizard")),Adjudication=lazy(()=>import("./adjudication/AdjudicationDashboard"));
function route():ComponentType{const path=location.pathname;if(path.startsWith("/business"))return Business;if(path.startsWith("/adjudication"))return Adjudication;if(path.startsWith("/owner/new"))return Wizard;if(path.startsWith("/owner"))return Owner;if(path.startsWith("/kiosk"))return Kiosk;return DemoHome}
const Root=route();
createRoot(document.getElementById("root")!).render(<StrictMode><Suspense fallback={<main className="route-loading" aria-live="polite">화면을 준비하고 있습니다…</main>}><Root/></Suspense></StrictMode>);
