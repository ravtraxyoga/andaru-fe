import { Navigate, Route, Routes } from 'react-router';
import { useParent } from './hooks/useAuth';
import { Layout } from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Children from './pages/Children';
import Schedules from './pages/Schedules';
import Reports from './pages/Reports';
import SessionReport from './pages/SessionReport';
import Settings from './pages/Settings';
import Daru from './pages/Daru';
import Downloads from './pages/Downloads';
import AdminQuestions from './pages/admin/AdminQuestions';
import QuestionEdit from './pages/admin/QuestionEdit';
import AdminImport from './pages/admin/AdminImport';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminReleases from './pages/admin/AdminReleases';

export default function App() {
  const parent = useParent();
  if (!parent) {
    return (
      <Routes>
        <Route path="/daftar" element={<Register />} />
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="anak" element={<Children />} />
        <Route path="jadwal" element={<Schedules />} />
        <Route path="laporan" element={<Reports />} />
        <Route path="sesi/:id" element={<SessionReport />} />
        <Route path="pengaturan" element={<Settings />} />
        <Route path="daru" element={<Daru />} />
        <Route path="unduh" element={<Downloads />} />
        {parent.is_admin && (
          <>
            <Route path="admin" element={<AdminQuestions />} />
            <Route path="admin/soal/:id" element={<QuestionEdit />} />
            <Route path="admin/impor" element={<AdminImport />} />
            <Route path="admin/pengguna" element={<AdminUsers />} />
            <Route path="admin/pengguna/:id" element={<AdminUserDetail />} />
            <Route path="admin/update" element={<AdminReleases />} />
          </>
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
