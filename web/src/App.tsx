import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth-context';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import CheckIn from './pages/CheckIn';
import NotFound from './pages/NotFound';
import DesktopConnect from './pages/DesktopConnect';
import { Fragment } from 'react';
import Sources from './pages/Sources';
import Evaluation from './pages/Evaluation';
import Legal from './pages/Legal';

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <span className="size-8 animate-spin rounded-full border-2 border-foreground/20 border-t-foreground" />
    </div>
  );
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loaded } = useAuth();
  if (!loaded) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <Fragment key={user.id}>{children}</Fragment>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/*" element={<Login />} />
      <Route path="/signup/*" element={<Signup />} />
      <Route path="/desktop/connect" element={<DesktopConnect />} />
      <Route path="/sources" element={<Sources />} />
      <Route path="/evaluation" element={<Evaluation />} />
      <Route path="/privacy" element={<Legal kind="privacy" />} />
      <Route path="/terms" element={<Legal kind="terms" />} />
      <Route path="/tos" element={<Legal kind="terms" />} />
      <Route path="/terms-of-use" element={<Legal kind="terms" />} />
      <Route
        path="/app"
        element={
          <RequireUser>
            <CheckIn />
          </RequireUser>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
