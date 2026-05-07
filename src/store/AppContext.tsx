import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState, Participant, Task, RouterDiagnostic, CompetitionState } from '../types';
import { generateId } from '../lib/utils';
import { initialMockData } from '../data/mockData';

interface AppContextType {
  state: AppState;
  setCompetitionState: (state: CompetitionState) => void;
  updateParticipantScore: (participantId: string, taskId: string, score: number, secureToken?: string) => void;
  updateTask: (task: Task) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'totalScore' | 'taskScores' | 'lastUpdated'>) => void;
  updateDiagnostic: (diagnostic: RouterDiagnostic) => void;
  loginAdmin: (passkey: string) => Promise<boolean>;
  logoutAdmin: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialMockData);

  const loginAdmin = async (passkey: string) => {
    try {
      const BACKEND_URL = 'http://localhost:3001';
      const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passkey })
      });

      if (!res.ok) return false;

      const { token } = await res.json();
      if (token) {
        sessionStorage.setItem('adminToken', token);
        setState(prev => ({ ...prev, isAdminAuthenticated: true }));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logoutAdmin = () => {
    sessionStorage.removeItem('adminToken');
    setState(prev => ({ ...prev, isAdminAuthenticated: false }));
  };

  const setCompetitionState = (competitionState: CompetitionState) => {
    setState((prev) => ({ ...prev, competitionState }));
  };

  const updateParticipantScore = (participantId: string, taskId: string, score: number, secureToken?: string) => {
    // SECURITY FIX: Prevent unauthorized score tampering from clients.
    // Point updates from the router scanner must include a valid secure token (simulating HMAC signature).
    if (secureToken !== 'router-scanner-secret-token') {
      console.error('SECURITY WARNING: Unauthorized point update attempt rejected.');
      return;
    }

    setState((prev) => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task) return prev;

      // SECURITY BOUND CHECK: Ensure points cannot exceed the task's maximum limit.
      const validatedScore = Math.min(Math.max(0, score), task.maxScore);

      return {
        ...prev,
        participants: prev.participants.map((p) => {
          if (p.id === participantId) {
            const existingTaskScoreIndex = p.taskScores.findIndex(ts => ts.taskId === taskId);
            let newTaskScores = [...p.taskScores];
            
            if (existingTaskScoreIndex >= 0) {
              newTaskScores[existingTaskScoreIndex] = { ...newTaskScores[existingTaskScoreIndex], score: validatedScore };
            } else {
              newTaskScores.push({ taskId, score: validatedScore, completedAt: new Date().toISOString() });
            }

            const totalScore = newTaskScores.reduce((sum, ts) => sum + ts.score, 0);

            return {
              ...p,
              taskScores: newTaskScores,
              totalScore,
              lastUpdated: new Date().toISOString()
            };
          }
          return p;
        })
      };
    });
  };

  const updateTask = (task: Task) => {
    setState((prev) => ({
      ...prev,
      tasks: prev.tasks.map((t) => (t.id === task.id ? task : t)),
    }));
  };

  const addParticipant = (participantData: Omit<Participant, 'id' | 'totalScore' | 'taskScores' | 'lastUpdated'>) => {
    const newParticipant: Participant = {
      ...participantData,
      id: `p${state.participants.length + 1}_${generateId()}`,
      totalScore: 0,
      taskScores: [],
      lastUpdated: new Date().toISOString()
    };
    setState((prev) => ({
      ...prev,
      participants: [...prev.participants, newParticipant],
    }));
  };

  const updateDiagnostic = (diagnostic: RouterDiagnostic) => {
    setState((prev) => {
      const exists = prev.diagnostics.find(d => d.id === diagnostic.id);
      if (exists) {
        return {
          ...prev,
          diagnostics: prev.diagnostics.map((d) => (d.id === diagnostic.id ? diagnostic : d)),
        };
      } else {
        return {
          ...prev,
          diagnostics: [...prev.diagnostics, diagnostic],
        };
      }
    });
  };

  return (
    <AppContext.Provider value={{ state, setCompetitionState, updateParticipantScore, updateTask, addParticipant, updateDiagnostic, loginAdmin, logoutAdmin }}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
