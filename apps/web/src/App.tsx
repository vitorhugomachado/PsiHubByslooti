import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { Landing } from './pages/Landing'
import { Landing2 } from './pages/Landing2'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { Dashboard } from './pages/Dashboard'
import { Patients } from './pages/Patients'
import { Agenda } from './pages/Agenda'
import { Financeiro } from './pages/Financeiro'
import { PortalLayout } from './pages/portal/PortalLayout'
import { PortalLogin } from './pages/portal/PortalLogin'
import { PortalHome } from './pages/portal/PortalHome'
import { PortalSessions } from './pages/portal/PortalSessions'
import { PortalFinance } from './pages/portal/PortalFinance'
import { PortalMessages } from './pages/portal/PortalMessages'
import { PortalMore } from './pages/portal/PortalMore'

function Protected({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/landing" replace />
  return <Layout>{children}</Layout>
}

// Area do paciente: tem a propria sessao (token do portal) e a propria moldura.
function Patient({ children }: { children: React.ReactNode }) {
  return <PortalLayout>{children}</PortalLayout>
}

export default function App() {
  const { user, loading } = useAuth()

  return (
    <Routes>
      {/* Portal do paciente */}
      <Route path="/portal/login" element={<PortalLogin />} />
      <Route
        path="/portal"
        element={
          <Patient>
            <PortalHome />
          </Patient>
        }
      />
      <Route
        path="/portal/sessoes"
        element={
          <Patient>
            <PortalSessions />
          </Patient>
        }
      />
      <Route
        path="/portal/financeiro"
        element={
          <Patient>
            <PortalFinance />
          </Patient>
        }
      />
      <Route
        path="/portal/recados"
        element={
          <Patient>
            <PortalMessages />
          </Patient>
        }
      />
      <Route
        path="/portal/mais"
        element={
          <Patient>
            <PortalMore />
          </Patient>
        }
      />

      {/* Landing page (publica) */}
      <Route path="/landing" element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/landing2" element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Landing2 />} />

      {/* Painel da clinica */}
      <Route path="/login" element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/cadastro" element={loading ? <Spinner /> : user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        path="/"
        element={
          <Protected>
            <Dashboard />
          </Protected>
        }
      />
      <Route
        path="/pacientes"
        element={
          <Protected>
            <Patients />
          </Protected>
        }
      />
      <Route
        path="/agenda"
        element={
          <Protected>
            <Agenda />
          </Protected>
        }
      />
      <Route
        path="/financeiro"
        element={
          <Protected>
            <Financeiro />
          </Protected>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
