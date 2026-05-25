import React, { useEffect, useState } from "react";
import PearlCourtEstate from "./PearlCourtEstate.jsx";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: "",
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected application error",
    };
  }

  componentDidCatch(error, info) {
    console.error("Pearl Court EMS error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: "100vh",
            background: "#f0ede8",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            fontFamily: "Arial, sans-serif",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#fff",
              borderRadius: 18,
              padding: 24,
              boxShadow: "0 18px 45px rgba(0,0,0,0.12)",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 10 }}>⚠️</div>

            <h2
              style={{
                color: "#1a1a2e",
                marginBottom: 10,
                fontSize: 22,
              }}
            >
              Pearl Court EMS needs to reload
            </h2>

            <p
              style={{
                color: "#5a5a7a",
                fontSize: 14,
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              The application encountered a temporary issue. Please reload the
              app to continue.
            </p>

            <button
              onClick={() => window.location.reload()}
              style={{
                width: "100%",
                minHeight: 46,
                border: "none",
                borderRadius: 12,
                background: "#1a1a2e",
                color: "#fff",
                fontWeight: 700,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Reload App
            </button>

            <div
              style={{
                marginTop: 14,
                fontSize: 11,
                color: "#9090b0",
                wordBreak: "break-word",
              }}
            >
              {this.state.errorMessage}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function NetworkStatusBanner() {
  const [online, setOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine
  );

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (online) return null;

  return (
    <div
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(12px + env(safe-area-inset-bottom))",
        zIndex: 9999,
        background: "#c0392b",
        color: "#fff",
        padding: "12px 16px",
        borderRadius: 14,
        fontSize: 13,
        fontWeight: 700,
        textAlign: "center",
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
    >
      You are offline. Some cloud sync features may be unavailable.
    </div>
  );
}

const STORE_READY_CSS = `
html,
body,
#root {
  min-height: 100%;
  width: 100%;
  margin: 0;
  background: #f0ede8;
  overscroll-behavior-y: none;
  -webkit-text-size-adjust: 100%;
  -webkit-tap-highlight-color: transparent;
}

body {
  touch-action: manipulation;
}

/* Prevent iOS input zoom */
input,
select,
textarea {
  font-size: 16px !important;
}

/* App-store friendly tap targets */
button,
.btn,
.sb-btn,
.tab-pill {
  min-height: 44px !important;
  touch-action: manipulation;
}

/* Smoother mobile app feel */
* {
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Better modal behavior on phone */
.modal-bg {
  padding-top: max(16px, env(safe-area-inset-top)) !important;
  padding-bottom: max(16px, env(safe-area-inset-bottom)) !important;
}

.modal-box {
  max-height: calc(100vh - 32px) !important;
  width: min(100%, 540px) !important;
}

/* Better toast positioning on mobile */
.toast {
  top: calc(12px + env(safe-area-inset-top)) !important;
  left: 14px !important;
  right: 14px !important;
  max-width: none !important;
}

/* Prevent tables/grids from breaking mobile layout */
.card {
  overflow-x: auto;
}

/* Better scrolling for grid table rows */
.thead,
.trow {
  min-width: 680px;
}

/* Stronger mobile card spacing */
.card,
.card-dark {
  border-radius: 18px !important;
}

/* Mobile-first adjustment */
@media (max-width: 768px) {
  body {
    background: #f0ede8;
  }

  /* Convert main app layout from desktop split to mobile stacked */
  div[style*="display: flex"][style*="min-height: 100vh"] {
    flex-direction: column !important;
  }

  /* Sidebar becomes mobile navigation area */
  div[style*="width: 218px"] {
    width: 100% !important;
    height: auto !important;
    position: relative !important;
    top: auto !important;
    flex-shrink: 0 !important;
    border-right: none !important;
    border-bottom: 1px solid #e4dfd8 !important;
    padding: 12px 10px !important;
    overflow-x: auto !important;
    overflow-y: visible !important;
    white-space: nowrap !important;
  }

  /* Navigation buttons become touch-friendly horizontal pills */
  .sb-btn {
    width: auto !important;
    display: inline-flex !important;
    margin: 3px !important;
    min-width: max-content !important;
    padding: 10px 14px !important;
    border-radius: 999px !important;
  }

  /* Main content better on mobile */
  div[style*="flex: 1"][style*="padding"] {
    padding: 14px !important;
    max-width: 100% !important;
    overflow-x: hidden !important;
  }

  .sec-title {
    font-size: 19px !important;
    line-height: 1.25 !important;
  }

  .stat-val {
    font-size: 24px !important;
  }

  .btn {
    padding: 12px 16px !important;
    font-size: 14px !important;
    border-radius: 12px !important;
  }

  .btn-sm {
    padding: 9px 12px !important;
    font-size: 12px !important;
  }

  .inp,
  .sel,
  .search-inp {
    font-size: 16px !important;
    min-height: 44px !important;
  }

  .modal-box {
    border-radius: 18px !important;
    padding: 20px !important;
  }

  .modal-title {
    font-size: 19px !important;
    line-height: 1.25 !important;
  }

  .code-box {
    font-size: 24px !important;
    letter-spacing: 5px !important;
  }
}

/* Very small phones */
@media (max-width: 420px) {
  .thead,
  .trow {
    min-width: 620px;
  }

  .card {
    padding: 14px !important;
  }

  .modal-box {
    padding: 18px !important;
  }
}
`;

function App() {
  useEffect(() => {
    document.title = "Pearl Court EMS";

    const metaTheme = document.querySelector("meta[name='theme-color']");
    if (metaTheme) {
      metaTheme.setAttribute("content", "#1a1a2e");
    }
  }, []);

  return (
    <AppErrorBoundary>
      <PearlCourtEstate />
      <NetworkStatusBanner />
      <style>{STORE_READY_CSS}</style>
    </AppErrorBoundary>
  );
}

export default App;