import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppState, Participant, Task, RouterDiagnostic, CompetitionState } from '../types';
import { generateId } from '../lib/utils';
import { initialMockData } from '../data/mockData';

interface AppContextType {
  state: AppState;
  setCompetitionState: (state: CompetitionState) => void;
  updateParticipantScore: (participantId: string, taskId: string, score: number) => void;
  updateTask: (task: Task) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'totalScore' | 'taskScores' | 'lastUpdated'>) => void;
  updateDiagnostic: (diagnostic: RouterDiagnostic) => void;
  loginAdmin: (passkey: string) => boolean;
  logoutAdmin: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialMockData);

  const loginAdmin = (passkey: string) => {
    // Hardcoded mock passkey
    if (passkey === 'admin2026') {
      setState(prev => ({ ...prev, isAdminAuthenticated: true }));
      return true;
    }
    return false;
  };

  const logoutAdmin = () => {
    setState(prev => ({ ...prev, isAdminAuthenticated: false }));
  };

  const setCompetitionState = (competitionState: CompetitionState) => {
    setState((prev) => ({ ...prev, competitionState }));
  };

  const updateParticipantScore = (participantId: string, taskId: string, score: number) => {
    setState((prev) => {
      return {
        ...prev,
        participants: prev.participants.map((p) => {
          if (p.id === participantId) {
            const existingTaskScoreIndex = p.taskScores.findIndex(ts => ts.taskId === taskId);
            let newTaskScores = [...p.taskScores];
            
            if (existingTaskScoreIndex >= 0) {
              newTaskScores[existingTaskScoreIndex] = { ...newTaskScores[existingTaskScoreIndex], score };
            } else {
              newTaskScores.push({ taskId, score, completedAt: new Date().toISOString() });
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
