export type CompetitionState = 'NOT_STARTED' | 'RUNNING' | 'FINISHED';

export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Expert';

export type TaskCategory = 'Troubleshooting' | 'Implementation' | 'Service';

export interface Hint {
  id: string;
  content: string;
}

export interface Task {
  id: string;
  title: string;
  category: TaskCategory;
  subCategory: string;
  difficulty: Difficulty;
  maxScore: number;
  description: string;
  hints: Hint[];
  writeup: string;
  isAvailable: boolean;
  scoreValueHint: string;
  targetDevice: string;
  solversCount: number;
  owner: string;
  checkCommand: string;
}

export type ParticipantStatus = 'Online' | 'Offline' | 'Connecting' | 'Issues';

export type ParticipantCategory = 'Engineer' | 'Student';

export interface TaskScore {
  taskId: string;
  score: number;
  completedAt: string;
}

export interface Participant {
  id: string;
  name: string;
  organization: string;
  category: ParticipantCategory;
  routerNumber: string;
  routerIp: string;
  totalScore: number;
  taskScores: TaskScore[];
  status: ParticipantStatus;
  lastUpdated: string;
}

export interface DiagnosticLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  message: string;
}

export interface RouterDiagnostic {
  id: string;
  participantId: string;
  ip: string;
  routerNumber: string;
  status: 'Healthy' | 'Degraded' | 'Down' | 'Unknown';
  lastCheck: string;
  isReachable: boolean;
  servicesReachable: Record<string, boolean>;
  protocolsStatus: Record<string, 'Up' | 'Down'>;
  validationPassed: boolean;
  logs: DiagnosticLog[];
}

export interface AppState {
  competitionState: CompetitionState;
  tasks: Task[];
  participants: Participant[];
  diagnostics: RouterDiagnostic[];
  isAdminAuthenticated: boolean;
}
