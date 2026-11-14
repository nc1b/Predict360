import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth-context';
import Landing from './pages/Landing';
import { Login, Signup } from './pages/Auth';
import CheckIn from './pages/CheckIn';
import NotFound from './pages/NotFound';

function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground" role="status">
      Loading…
    </div>
  );
}

function RequireUser({ children }: { children: React.ReactNode }) {
  const { user, loaded } = useAuth();
  if (!loaded) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login/*" element={<Login />} />
      <Route path="/signup/*" element={<Signup />} />
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
