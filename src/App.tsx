/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './store/AppContext';
import { NavigationLayout } from './components/NavigationLayout';
import { DashboardPage } from './pages/DashboardPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { ParticipantDetailPage } from './pages/ParticipantDetailPage';
import { TasksPage } from './pages/TasksPage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { AdminPanelPage } from './pages/AdminPanelPage';

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<NavigationLayout />}>
            <Route index element={<DashboardPage />} />
            <Route path="participants" element={<ParticipantsPage />} />
            <Route path="participants/:id" element={<ParticipantDetailPage />} />
            <Route path="tasks" element={<TasksPage />} />
            <Route path="tasks/:id" element={<TaskDetailPage />} />
            <Route path="admin" element={<AdminPanelPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}
