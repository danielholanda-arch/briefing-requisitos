import { createBrowserRouter, Navigate } from 'react-router'
import { NaoEncontrada } from '@/components/NaoEncontrada'
import { AdminLayout } from '@/features/admin/AdminLayout'
import { AdminsPage } from '@/features/admin/AdminsPage'
import { ClienteDetalhePage } from '@/features/admin/ClienteDetalhePage'
import { ClientesPage } from '@/features/admin/ClientesPage'
import { PerguntasPage } from '@/features/admin/PerguntasPage'
import { ProjetoDetalhePage } from '@/features/admin/ProjetoDetalhePage'
import { QuestionariosPage } from '@/features/admin/QuestionariosPage'
import { LoginPage } from '@/features/auth/LoginPage'
import { RedirecionarPorPapel, RequireRole } from '@/features/auth/RequireRole'
import { BriefingPage, IrParaQuestionario } from '@/features/questionario/BriefingPage'
import { ClienteLayout } from '@/features/questionario/ClienteLayout'
import { ProjetosPage } from '@/features/questionario/ProjetosPage'

export const router = createBrowserRouter([
  { path: '/', element: <RedirecionarPorPapel /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/questionario',
    element: (
      <RequireRole papel="cliente">
        <ClienteLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <ProjetosPage /> },
      { path: ':projetoId', element: <IrParaQuestionario /> },
      { path: ':projetoId/:questionarioId', element: <BriefingPage /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <RequireRole papel="admin">
        <AdminLayout />
      </RequireRole>
    ),
    children: [
      { index: true, element: <ClientesPage /> },
      { path: 'usuarios/:id', element: <ClienteDetalhePage /> },
      { path: 'projetos/:id', element: <ProjetoDetalhePage /> },
      { path: 'questionarios', element: <QuestionariosPage /> },
      { path: 'questionarios/:id', element: <PerguntasPage /> },
      { path: 'perguntas', element: <Navigate to="/admin/questionarios" replace /> },
      { path: 'administradores', element: <AdminsPage /> },
    ],
  },
  { path: '*', element: <NaoEncontrada /> },
])
