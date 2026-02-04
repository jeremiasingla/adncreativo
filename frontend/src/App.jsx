import React from "react";
import ReactDOM from "react-dom";
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { FullScreenLoadingSpinner } from "./components/LoadingSpinner";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import OnboardingValidate from "./pages/OnboardingValidate";
import Workspace from "./pages/Workspace";

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
              Error al cargar
            </h1>
            <pre className="text-sm text-gray-700 overflow-auto">
              {this.state.error?.message ?? "Error desconocido"}
            </pre>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-4 px-4 py-2 bg-black text-white rounded"
            >
              Reintentar
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
  transition: "background-color 0.2s ease, backdrop-filter 0.2s ease",
};

const headerInitialStyle = {
  ...headerBaseStyle,
  backgroundColor: "rgb(255, 255, 255)",
};

const headerScrolledStyle = {
  ...headerBaseStyle,
  backgroundColor: "oklab(0.999994 0.0000455677 0.0000200868 / 0.8)",
  backdropFilter: "blur(20px) saturate(180%)",
  WebkitBackdropFilter: "blur(20px) saturate(180%)",
};

const navStyle = {
  backdropFilter: "blur(5px)",
  WebkitBackdropFilter: "blur(5px)",
};

function Navigation({ onOpenSignIn }) {
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = React.useState(false);

  React.useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const headerStyle = scrolled ? headerScrolledStyle : headerInitialStyle;

  return (
    <header className="shadow-sm" style={headerStyle}>
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="text-2xl font-serif font-bold flex items-center gap-2"
            aria-label="Ir al inicio"
          >
            <span style={{ color: "rgb(15, 20, 25)" }}>ADNCreativo</span>
          </Link>
        </div>
        <nav style={navStyle} className="flex items-center gap-4">
          {user ? (
            <>
              <span className="text-sm text-gray-600 truncate max-w-[180px]">
                {user.name || user.email}
              </span>
              <button
                type="button"
                onClick={logout}
                className="px-6 py-2 rounded-full hover:bg-gray-100 transition text-sm font-medium"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                Cerrar sesión
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenSignIn}
              className="px-6 py-2 rounded-full bg-black text-white hover:bg-gray-800 transition text-sm font-medium"
            >
              Iniciar sesión
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

function AppLayout() {
  const location = useLocation();
  const pathname = location.pathname;
  const segments = pathname.split("/").filter(Boolean);
  const firstSegment = segments[0];
  const isWorkspaceRoute = !["onboarding"].includes(firstSegment) && segments.length >= 1;
  const hideHeader =
    pathname === "/onboarding/step/validate" || isWorkspaceRoute;

  const [showAuthModal, setShowAuthModal] = React.useState(false);

  return (
    <div className="min-h-screen bg-white">
      {!hideHeader && <Navigation onOpenSignIn={() => setShowAuthModal(true)} />}
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
      
      {showAuthModal &&
        ReactDOM.createPortal(
          <Login onClose={() => setShowAuthModal(false)} />,
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
