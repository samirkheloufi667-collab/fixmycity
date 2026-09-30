import { MapPinOff } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { BrowserRouter, Link, Route, Routes } from 'react-router';
import { Layout } from '@/components/Layout';
import { ToastProvider } from '@/components/ui/toast';
import { buttonClass, EmptyState, Spinner } from '@/components/ui/primitives';
import { AuthProvider } from '@/lib/auth';
import { ReferenceProvider } from '@/lib/reference';

// Chaque page est chargée à la demande : l'accueil n'embarque ni Leaflet ni l'espace ville.
const Home = lazy(() => import('@/pages/Home'));
const MapPage = lazy(() => import('@/pages/MapPage'));
const NewReport = lazy(() => import('@/pages/NewReport'));
const ReportPage = lazy(() => import('@/pages/ReportPage'));
const MyReports = lazy(() => import('@/pages/MyReports'));
const Login = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('@/pages/Auth').then((m) => ({ default: m.Register })));
const AdminGate = lazy(() => import('@/pages/admin/AdminGate'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const Queue = lazy(() => import('@/pages/admin/Queue'));
const UsersPage = lazy(() => import('@/pages/admin/UsersPage'));

function NotFound() {
  return (
    <EmptyState
      icon={<MapPinOff className="size-5" />}
      title="Page introuvable"
      text="Cette adresse ne correspond à aucune page de FixMyCity."
      action={
        <Link to="/" className={buttonClass('secondary')}>
          Retour à l’accueil
        </Link>
      }
    />
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ReferenceProvider>
          <ToastProvider>
            <Suspense fallback={<Spinner />}>
            <Routes>
              <Route index element={<Home />} />
              <Route path="connexion" element={<Login />} />
              <Route path="inscription" element={<Register />} />
              <Route element={<Layout fullBleed />}>
                <Route path="carte" element={<MapPage />} />
              </Route>
              <Route element={<Layout />}>
                <Route path="signaler" element={<NewReport />} />
                <Route path="signalements/:id" element={<ReportPage />} />
                <Route path="mes-signalements" element={<MyReports />} />
                <Route path="admin" element={<AdminGate />}>
                  <Route index element={<Dashboard />} />
                  <Route path="file" element={<Queue />} />
                  <Route path="utilisateurs" element={<UsersPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Route>
            </Routes>
            </Suspense>
          </ToastProvider>
        </ReferenceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
