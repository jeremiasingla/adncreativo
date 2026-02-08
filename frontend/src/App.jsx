import React, { Suspense, lazy } from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FullScreenLoadingSpinner } from "./components/LoadingSpinner";
import Header from "./components/Header";
import i18n from "./i18n";

const Home = lazy(() => import("./pages/Home"));
const Pricing = lazy(() => import("./pages/Pricing"));
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

function AppLayout() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const pathname = location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isWorkspaceRoute =
    !["onboarding", "pricing"].includes(firstSegment) && segments.length >= 1;
  const hideHeader =
    pathname === "/onboarding/step/validate" || isWorkspaceRoute;

  const [showAuthModal, setShowAuthModal] = React.useState(false);
  const [isSignUp, setIsSignUp] = React.useState(false);

  const langKey = i18n.language?.startsWith("en") ? "en" : "es";

  return (
    <div className="min-h-screen bg-white">
      {!hideHeader && <Header onOpenSignIn={() => {
        setShowAuthModal(true);
        setIsSignUp(false);
      }} />}
      <Suspense fallback={<FullScreenLoadingSpinner />} key={langKey}>
        <Routes>
          <Route path="/" element={<RootRoute />} />
          <Route path="/pricing" element={<Pricing />} />
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
