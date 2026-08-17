import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { OverviewPage } from '@/features/overview/OverviewPage';
import { AgentsPage } from '@/features/overview/AgentsPage';
import { AgentDetailPage } from '@/features/agent-detail/AgentDetailPage';
import { CreateAgentPage } from '@/features/create-agent/CreateAgentPage';
import { ProjectsPage } from '@/features/projects/ProjectsPage';
import { TasksPage } from '@/features/tasks/TasksPage';
import { ActivityPage } from '@/features/activity/ActivityPage';
import { ModelsPage } from '@/features/models/ModelsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'agents', element: <AgentsPage /> },
      { path: 'agents/new', element: <CreateAgentPage /> },
      { path: 'agents/:agentId', element: <AgentDetailPage /> },
      { path: 'projects', element: <ProjectsPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'activity', element: <ActivityPage /> },
      { path: 'models', element: <ModelsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
]);
