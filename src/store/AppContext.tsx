import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppState, Participant, Task, RouterDiagnostic, CompetitionState, ParticipantStatus } from '../types';
import { generateId } from '../lib/utils';
import { initialMockData } from '../data/mockData';

const STORAGE_KEYS = {
  TOKEN: 'adminToken',
  COMPETITION_STATE: 'competitionState',
  PARTICIPANTS: 'participants',
  SCORES: 'participantScores',
};

interface AppContextType {
  state: AppState;
  setCompetitionState: (state: CompetitionState) => void;
  updateParticipantScore: (participantId: string, taskId: string, score: number, secureToken?: string) => void;
  updateParticipantStatus: (participantId: string, status: ParticipantStatus) => void;
  updateTask: (task: Task) => void;
  addParticipant: (participant: Omit<Participant, 'id' | 'totalScore' | 'taskScores' | 'lastUpdated'>) => void;
  updateDiagnostic: (diagnostic: RouterDiagnostic) => void;
  loginAdmin: (passkey: string) => Promise<boolean>;
  logoutAdmin: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function loadInitialState(): AppState {
  const base = { ...initialMockData };

  // Restore competition state
  const savedCompState = localStorage.getItem(STORAGE_KEYS.COMPETITION_STATE);
  if (savedCompState && ['NOT_STARTED', 'RUNNING', 'FINISHED'].includes(savedCompState)) {
    base.competitionState = savedCompState as CompetitionState;
  }

  // Restore admin session
  const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
  if (token) {
    base.isAdminAuthenticated = true;
  }

  // Restore participant scores and status
  const savedScores = localStorage.getItem(STORAGE_KEYS.SCORES);
  if (savedScores) {
    try {
      const scoresMap: Record<string, { taskScores: any[]; totalScore: number; status: ParticipantStatus }> = JSON.parse(savedScores);
      base.participants = base.participants.map(p => {
        const saved = scoresMap[p.id];
        if (saved) {
          return {
            ...p,
            taskScores: saved.taskScores || p.taskScores,
            totalScore: saved.totalScore ?? p.totalScore,
            status: saved.status || p.status,
          };
        }
        return p;
      });
    } catch {}
  }

  return base;
}

function saveParticipantData(participants: Participant[]) {
  const scoresMap: Record<string, { taskScores: any[]; totalScore: number; status: ParticipantStatus }> = {};
  for (const p of participants) {
    scoresMap[p.id] = {
      taskScores: p.taskScores,
      totalScore: p.totalScore,
      status: p.status,
    };
  }
  localStorage.setItem(STORAGE_KEYS.SCORES, JSON.stringify(scoresMap));
}

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(loadInitialState);

  // Validate token on mount
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    if (token) {
      fetch('http://localhost:3001/api/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {});
    }
  }, []);

  // Poll backend scores so all users see the same scores
  useEffect(() => {
    const BACKEND_URL = 'http://localhost:3001';

    const fetchScores = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/scores`);
        if (!res.ok) return;
        const backendScores: Record<string, { taskScores: { taskId: string; score: number; completedAt: string }[]; totalScore: number; name?: string; status?: string; lastUpdated?: string }> = await res.json();

        setState(prev => {
          let changed = false;
          const newParticipants = prev.participants.map(p => {
            const remote = backendScores[p.id];
            if (!remote) return p;
            // Only update if backend has newer data
            if (remote.lastUpdated && p.lastUpdated && remote.lastUpdated <= p.lastUpdated) return p;
            changed = true;
            return {
              ...p,
              taskScores: remote.taskScores || p.taskScores,
              totalScore: remote.totalScore ?? p.totalScore,
              status: (remote.status as any) || p.status,
              lastUpdated: remote.lastUpdated || p.lastUpdated
            };
          });
          if (!changed) return prev;
          saveParticipantData(newParticipants);
          return { ...prev, participants: newParticipants };
        });
      } catch {}
    };

    fetchScores();
    const interval = setInterval(fetchScores, 15000);
    return () => clearInterval(interval);
  }, []);

  // Poll backend competition state so all users see the same buttons
  useEffect(() => {
    const BACKEND_URL = 'http://localhost:3001';

    const fetchCompState = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/competition-state`);
        if (!res.ok) return;
        const data: { competitionState: CompetitionState; updatedAt?: string } = await res.json();
        if (data.competitionState) {
          setState(prev => {
            if (prev.competitionState === data.competitionState) return prev;
            localStorage.setItem(STORAGE_KEYS.COMPETITION_STATE, data.competitionState);
            return { ...prev, competitionState: data.competitionState };
          });
        }
      } catch {}
    };

    fetchCompState();
    const interval = setInterval(fetchCompState, 10000);
    return () => clearInterval(interval);
  }, []);

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
        localStorage.setItem(STORAGE_KEYS.TOKEN, token);
        setState(prev => ({ ...prev, isAdminAuthenticated: true }));
        return true;
      }
      return false;
    } catch (err) {
      return false;
    }
  };

  const logoutAdmin = () => {
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    setState(prev => ({ ...prev, isAdminAuthenticated: false }));
  };

  const setCompetitionState = (competitionState: CompetitionState) => {
    localStorage.setItem(STORAGE_KEYS.COMPETITION_STATE, competitionState);
    setState((prev) => ({ ...prev, competitionState }));

    // Sync to backend so all users see the same state
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN);
    fetch('http://localhost:3001/api/competition-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ competitionState })
    }).catch(() => {});
  };

  const updateParticipantScore = (participantId: string, taskId: string, score: number, secureToken?: string) => {
    if (secureToken !== 'router-scanner-secret-token') {
      console.error('SECURITY WARNING: Unauthorized point update attempt rejected.');
      return;
    }

    setState((prev) => {
      const task = prev.tasks.find(t => t.id === taskId);
      if (!task) return prev;

      const validatedScore = Math.min(Math.max(0, score), task.maxScore);

      const newParticipants = prev.participants.map((p) => {
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
      });

      saveParticipantData(newParticipants);

      return { ...prev, participants: newParticipants };
    });
  };

  const updateParticipantStatus = (participantId: string, status: ParticipantStatus) => {
    setState((prev) => {
      const newParticipants = prev.participants.map(p =>
        p.id === participantId ? { ...p, status, lastUpdated: new Date().toISOString() } : p
      );
      saveParticipantData(newParticipants);
      return { ...prev, participants: newParticipants };
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
    setState((prev) => {
      const newParticipants = [...prev.participants, newParticipant];
      saveParticipantData(newParticipants);
      return { ...prev, participants: newParticipants };
    });
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
    <AppContext.Provider value={{ state, setCompetitionState, updateParticipantScore, updateParticipantStatus, updateTask, addParticipant, updateDiagnostic, loginAdmin, logoutAdmin }}>
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
