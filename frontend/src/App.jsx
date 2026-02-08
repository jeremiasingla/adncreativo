import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { UserAvatar, useClerk } from "@clerk/clerk-react";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FullScreenLoadingSpinner } from "./components/LoadingSpinner";
import i18n, { setLanguage } from "./i18n";

const Home = lazy(() => import("./pages/Home"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const OnboardingValidate = lazy(() => import("./pages/OnboardingValidate"));
const Workspace = lazy(() => import("./pages/Workspace"));

class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-md">
            <h1 className="text-xl font-bold text-red-600 mb-2">
              {i18n.t("errors.loadError")}
            </h1>
            <pre className="text-sm text-gray-700 overflow-auto">
              {this.state.error?.message ?? i18n.t("errors.unknownError")}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-black text-white rounded transition-[transform] duration-200 ease-out hover:scale-[1.03] active:scale-[0.98]"
            >
              {i18n.t("common.retry")}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function RootRoute() {
  const { user, loading } = useAuth();
  if (loading) {
    return <FullScreenLoadingSpinner />;
  }
  return user ? <Dashboard /> : <Home />;
}

function GuestOnly({ children }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <FullScreenLoadingSpinner />;
  }
  return user ? <Navigate to="/" replace /> : children;
}

function AuthOnly({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return <FullScreenLoadingSpinner />;
  }
  if (!user) {
    try {
      sessionStorage.setItem("auth_return_path", location.pathname);
    } catch (_) {}
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}

const headerBaseStyle = {
  top: 0,
  left: 0,
  right: 0,
  position: "fixed",
  zIndex: 50,
  color: "rgb(15, 20, 25)",
  fontSize: 16,
  margin: 0,
  textAlign: "start",
  lineHeight: 24,
  fontWeight: 400,
  letterSpacing: "-0.16px",
  fontFamily:
    '"Inter Tight", "Inter Tight Fallback", "Inter Tight", ui-sans-serif, sans-serif, system-ui',
};

const navStyle = {
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
};

function Navigation({ onOpenSignIn }) {
  const { t, i18n: i18nInstance } = useTranslation();
  const { user, logout } = useAuth();
  const { openUserProfile } = useClerk();
  const currentLang = i18nInstance.language?.startsWith("en") ? "en" : "es";
  const [scrolled, setScrolled] = React.useState(false);
  const [showUserPopup, setShowUserPopup] = React.useState(false);
  const [popupPosition, setPopupPosition] = React.useState({ top: 0, right: 0 });
  const avatarButtonRef = React.useRef(null);
  const popupRef = React.useRef(null);

  const updatePopupPosition = React.useCallback(() => {
    if (avatarButtonRef.current) {
      const rect = avatarButtonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 8,
        right: window.innerWidth - rect.right,
      });
    }
  }, []);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    if (showUserPopup && avatarButtonRef.current) {
      updatePopupPosition();
      window.addEventListener("scroll", updatePopupPosition, true);
      window.addEventListener("resize", updatePopupPosition);
      return () => {
        window.removeEventListener("scroll", updatePopupPosition, true);
        window.removeEventListener("resize", updatePopupPosition);
      };
    }
  }, [showUserPopup, updatePopupPosition]);

  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        showUserPopup &&
        popupRef.current &&
        !popupRef.current.contains(e.target) &&
        avatarButtonRef.current &&
        !avatarButtonRef.current.contains(e.target)
      ) {
        setShowUserPopup(false);
      }
    };
    const handleEscape = (e) => {
      if (e.key === "Escape" && showUserPopup) setShowUserPopup(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showUserPopup]);

  const displayName = user?.name?.trim() || user?.email?.split("@")[0] || "Usuario";

  const headerClassName = [
    "header-liquid-glass",
    !scrolled && "header-liquid-glass--initial",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <>
      <header className={headerClassName} style={headerBaseStyle}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <Link
              to="/"
              className="text-2xl font-serif font-bold flex items-center gap-2"
              aria-label={t("nav.goHome")}
            >
              <span style={{ color: "rgb(15, 20, 25)" }}>ADNCreativo</span>
            </Link>
          </div>
          <nav style={navStyle} className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 text-sm font-medium text-neutral-600">
              <button
                type="button"
                onClick={() => setLanguage("es")}
                className={`px-2 py-1 rounded ${currentLang === "es" ? "bg-neutral-200 text-neutral-900 font-semibold" : "hover:bg-neutral-100"}`}
                aria-label="Español"
              >
                ES
              </button>
              <span className="text-neutral-300" aria-hidden>|</span>
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className={`px-2 py-1 rounded ${currentLang === "en" ? "bg-neutral-200 text-neutral-900 font-semibold" : "hover:bg-neutral-100"}`}
                aria-label="English"
              >
                EN
              </button>
            </div>
            {user ? (
              <button
                ref={avatarButtonRef}
                type="button"
                onClick={() => setShowUserPopup((prev) => !prev)}
                className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                aria-label={t("nav.userMenu")}
                aria-expanded={showUserPopup}
              >
                <UserAvatar
                  className="h-8 w-8"
                  aria-hidden="true"
                />
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenSignIn}
                className="btn-signin-3d items-center justify-center gap-2 whitespace-nowrap text-sm font-semibold ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer h-8 px-4 hidden md:flex rounded-full transition-[transform] duration-200 ease-out hover:scale-[1.03] active:scale-[0.98]"
              >
                {t("common.signIn")}
              </button>
            )}
          </nav>
        </div>
      </header>

      {showUserPopup &&
        ReactDOM.createPortal(
          <div
            ref={popupRef}
            role="dialog"
            aria-label={t("nav.userMenu")}
            tabIndex={-1}
            className="fixed min-w-[240px] bg-white rounded-xl shadow-xl border border-border overflow-hidden"
            style={{
              top: popupPosition.top,
              right: popupPosition.right,
              zIndex: 9999,
              animation: "fadeInUp 0.25s ease-out",
              boxShadow: "0 10px 40px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08)",
            }}
          >
            <div className="cl-userButtonPopoverMain">
              {/* User preview */}
              <div className="flex items-center gap-3 px-4 pt-4 pb-3">
                <div className="flex-shrink-0 w-9 h-9 rounded-full overflow-hidden bg-neutral-100">
                  <UserAvatar className="h-full w-full" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-neutral-900 truncate" data-variant="subtitle" data-color="inherit">
                    {displayName}
                  </div>
                  <div className="text-[13px] text-neutral-500 truncate" data-variant="body" data-color="secondary">
                    {user?.email || ""}
                  </div>
                </div>
              </div>
              {/* Actions */}
              <div role="menu" className="border-t border-border py-1">
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowUserPopup(false);
                    openUserProfile?.();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-current">
                    <svg fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4">
                      <path fillRule="evenodd" clipRule="evenodd" d="M6.559 2.536A.667.667 0 0 1 7.212 2h1.574a.667.667 0 0 1 .653.536l.22 1.101c.466.178.9.429 1.287.744l1.065-.36a.667.667 0 0 1 .79.298l.787 1.362a.666.666 0 0 1-.136.834l-.845.742c.079.492.079.994 0 1.486l.845.742a.666.666 0 0 1 .137.833l-.787 1.363a.667.667 0 0 1-.791.298l-1.065-.36c-.386.315-.82.566-1.286.744l-.22 1.101a.666.666 0 0 1-.654.536H7.212a.666.666 0 0 1-.653-.536l-.22-1.101a4.664 4.664 0 0 1-1.287-.744l-1.065.36a.666.666 0 0 1-.79-.298L2.41 10.32a.667.667 0 0 1 .136-.834l.845-.743a4.7 4.7 0 0 1 0-1.485l-.845-.742a.667.667 0 0 1-.137-.833l.787-1.363a.667.667 0 0 1 .791-.298l1.065.36c.387-.315.821-.566 1.287-.744l.22-1.101ZM7.999 10a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" />
                    </svg>
                  </span>
                  {t("common.manageAccount")}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setShowUserPopup(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
                >
                  <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center text-current">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M2.6 2.604A2.045 2.045 0 0 1 4.052 2h3.417c.544 0 1.066.217 1.45.604.385.387.601.911.601 1.458v.69c0 .413-.334.75-.746.75a.748.748 0 0 1-.745-.75v-.69a.564.564 0 0 0-.56-.562H4.051a.558.558 0 0 0-.56.563v7.875a.564.564 0 0 0 .56.562h3.417a.558.558 0 0 0 .56-.563v-.671c0-.415.333-.75.745-.75s.746.335.746.75v.671c0 .548-.216 1.072-.6 1.459a2.045 2.045 0 0 1-1.45.604H4.05a2.045 2.045 0 0 1-1.45-.604A2.068 2.068 0 0 1 2 11.937V4.064c0-.548.216-1.072.6-1.459Zm8.386 3.116a.743.743 0 0 1 1.055 0l1.74 1.75a.753.753 0 0 1 0 1.06l-1.74 1.75a.743.743 0 0 1-1.055 0 .753.753 0 0 1 0-1.06l.467-.47H5.858A.748.748 0 0 1 5.112 8c0-.414.334-.75.746-.75h5.595l-.467-.47a.753.753 0 0 1 0-1.06Z" />
                    </svg>
                  </span>
                  {t("common.signOut")}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}

function AppLayout() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const pathname = location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isWorkspaceRoute = !["onboarding"].includes(firstSegment) && segments.length >= 1;
  const hideHeader =
    pathname === "/onboarding/step/validate" || isWorkspaceRoute;

  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);

  const langKey = i18n.language?.startsWith("en") ? "en" : "es";

  return (
    <div className="min-h-screen bg-white">
      {!hideHeader && <Navigation onOpenSignIn={() => {
        setShowAuthModal(true);
        setIsSignUp(false);
      }} />}
      <Suspense fallback={<FullScreenLoadingSpinner />} key={langKey}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route
            path="/onboarding/step/validate"
            element={
              <AuthOnly>
                <OnboardingValidate />
              </AuthOnly>
            }
          />
          <Route
            path="/:workspaceSlug/*"
            element={
              <AuthOnly>
                <Workspace />
              </AuthOnly>
            }
          />
        </Routes>
      </Suspense>
      
      {showAuthModal &&
        ReactDOM.createPortal(
          <Suspense fallback={<FullScreenLoadingSpinner />}>
            <Login
              onClose={() => setShowAuthModal(false)}
              isSignUp={isSignUp}
              setIsSignUp={setIsSignUp}
            />
          </Suspense>,
          document.body
        )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <AppLayout />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
