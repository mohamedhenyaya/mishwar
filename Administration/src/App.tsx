import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { Layout } from '@/components/layout/Layout';
import { PageLoader } from '@/components/ui/Misc';
import { LoginPage } from '@/pages/LoginPage';

const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const LiveMapPage = lazy(() => import('@/pages/LiveMapPage'));
const ClientsPage = lazy(() => import('@/pages/ClientsPage'));
const ClientDetailPage = lazy(() => import('@/pages/ClientDetailPage'));
const DriversPage = lazy(() => import('@/pages/DriversPage'));
const DriverDetailPage = lazy(() => import('@/pages/DriverDetailPage'));
const RidesPage = lazy(() => import('@/pages/RidesPage'));
const WalletPage = lazy(() => import('@/pages/WalletPage'));
const SupportPage = lazy(() => import('@/pages/SupportPage'));
const ReviewsPage = lazy(() => import('@/pages/ReviewsPage'));
const CouponsPage = lazy(() => import('@/pages/CouponsPage'));
const NotificationsPage = lazy(() => import('@/pages/NotificationsPage'));
const AdminsPage = lazy(() => import('@/pages/AdminsPage'));
const AuditLogPage = lazy(() => import('@/pages/AuditLogPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const AccountPage = lazy(() => import('@/pages/AccountPage'));

function Protected() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <div className="flex h-screen items-center justify-center"><PageLoader /></div>;
  if (status === 'anonymous') return <Navigate to="/connexion" replace state={{ from: location.pathname + location.search }} />;
  return <Layout />;
}

export function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/connexion" element={<LoginPage />} />
        <Route element={<Protected />}>
          <Route index element={<DashboardPage />} />
          <Route path="carte" element={<LiveMapPage />} />
          <Route path="clients" element={<ClientsPage />} />
          <Route path="clients/:id" element={<ClientDetailPage />} />
          <Route path="capitaines" element={<DriversPage />} />
          <Route path="capitaines/:id" element={<DriverDetailPage />} />
          <Route path="courses" element={<RidesPage />} />
          <Route path="portefeuille" element={<WalletPage />} />
          <Route path="vehicules" element={<Navigate to="/capitaines?vehicleStatus=TO_REVIEW" replace />} />
          <Route path="support" element={<SupportPage />} />
          <Route path="avis" element={<ReviewsPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="administrateurs" element={<AdminsPage />} />
          <Route path="journal" element={<AuditLogPage />} />
          <Route path="parametres" element={<SettingsPage />} />
          <Route path="compte" element={<AccountPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
