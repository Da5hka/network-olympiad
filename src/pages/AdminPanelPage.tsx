import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../store/AppContext';
import { ShieldAlert, Play, Square, Settings, UserPlus, FileEdit, CheckCircle2, Server, LogOut, Lock, Activity, RefreshCw, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../lib/utils';
import { CompetitionState, ParticipantCategory } from '../types';

const BACKEND_URL = 'http://localhost:3001';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem('adminToken');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
}

interface CheckResult {
  participantId: string;
  participantName: string;
  routerIp: string;
  routerNumber: string;
  eveIp: string;
  error: string | null;
  totalScore: number;
  maxScore: number;
  checkedAt: string;
  challengeResults: {
    challengeId: string;
    category: string;
    subCategory: string;
    description: string;
    passed: boolean;
    points: number;
    maxPoints: number;
    error?: string;
    checks: {
      device: string;
      passed: boolean;
      output: string;
      error: string | null;
    }[];
  }[];
}

interface CheckStatus {
  running: boolean;
  startedAt: string | null;
  completedAt: string | null;
  progress: { completed: number; total: number };
  results: Record<string, CheckResult>;
}

export const AdminPanelPage: React.FC = () => {
  const { state, setCompetitionState, addParticipant, loginAdmin, logoutAdmin, updateParticipantScore, updateParticipantStatus } = useAppContext();
  const [activeTab, setActiveTab] = useState<'control' | 'register' | 'hints' | 'diagnostics'>('control');

  // Auth Form State
  const [passkey, setPasskey] = useState('');
  const [loginError, setLoginError] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regOrg, setRegOrg] = useState('');
  const [regRouter, setRegRouter] = useState('');
  const [regIp, setRegIp] = useState('');
  const [regCategory, setRegCategory] = useState<ParticipantCategory>('Student');
  const [regSuccess, setRegSuccess] = useState(false);
  const [regError, setRegError] = useState('');

  // Hint Form State
  const [hintSelectedTask, setHintSelectedTask] = useState('');
  const [hintContent, setHintContent] = useState('');
  const [hintSuccess, setHintSuccess] = useState(false);

  // Check State
  const [checkStatus, setCheckStatus] = useState<CheckStatus | null>(null);
  const [isCheckRunning, setIsCheckRunning] = useState(false);
  const [checkError, setCheckError] = useState('');
  const [expandedParticipant, setExpandedParticipant] = useState<string | null>(null);
  const [expandedChallenge, setExpandedChallenge] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Connectivity ping state
  const [isPinging, setIsPinging] = useState(false);
  const [lastPingTime, setLastPingTime] = useState<string | null>(null);

  // Auto-check State
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(false);
  const [autoCheckInfo, setAutoCheckInfo] = useState<{
    nextRunAt: string | null;
    lastAutoRunAt: string | null;
    runCount: number;
    participantCount: number;
    intervalMinutes: number;
  } | null>(null);
  const [countdown, setCountdown] = useState('');

  // Poll for check results
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Handle expired session (401 from any API call)
  const handleApiResponse = (res: Response) => {
    if (res.status === 401) {
      logoutAdmin();
      return false;
    }
    return true;
  };

  // Fetch auto-check status and poll for results when auto-check is on
  useEffect(() => {
    if (!state.isAdminAuthenticated) return;

    const fetchAutoStatus = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auto-check`, { headers: getAuthHeaders() });
        if (!handleApiResponse(res)) return;
        if (res.ok) {
          const data = await res.json();
          setAutoCheckEnabled(data.enabled);
          setAutoCheckInfo(data);
        }
      } catch {}
    };

    fetchAutoStatus();
    const statusPoll = setInterval(fetchAutoStatus, 10000);
    return () => clearInterval(statusPoll);
  }, [state.isAdminAuthenticated]);

  // Auto-check: poll results when enabled
  useEffect(() => {
    if (!autoCheckEnabled || !state.isAdminAuthenticated) return;

    const autoPoll = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/check-results`, { headers: getAuthHeaders() });
        if (res.ok) {
          const data: CheckStatus = await res.json();
          setCheckStatus(data);
          if (!data.running && data.completedAt) {
            applyCheckResults(data.results);
          }
        }
      } catch {}
    }, 10000);

    return () => clearInterval(autoPoll);
  }, [autoCheckEnabled, state.isAdminAuthenticated]);

  // Countdown timer
  useEffect(() => {
    if (!autoCheckInfo?.nextRunAt || !autoCheckEnabled) {
      setCountdown('');
      return;
    }

    const tick = () => {
      const diff = new Date(autoCheckInfo.nextRunAt!).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Шалгаж байна...');
        return;
      }
      const min = Math.floor(diff / 60000);
      const sec = Math.floor((diff % 60000) / 1000);
      setCountdown(`${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [autoCheckInfo?.nextRunAt, autoCheckEnabled]);

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/check-results`, {
          headers: getAuthHeaders()
        });
        const data: CheckStatus = await res.json();
        setCheckStatus(data);

        if (!data.running && data.completedAt) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setIsCheckRunning(false);

          // Update scores in frontend state
          applyCheckResults(data.results);
        }
      } catch (err) {
        console.error('Poll error:', err);
      }
    }, 3000);
  };

  const applyCheckResults = (results: Record<string, CheckResult>) => {
    for (const [participantId, result] of Object.entries(results)) {
      // Update participant connection status based on check result
      if (result.error && (result.error.startsWith('EVE connection failed') || result.error.startsWith('EVE environment timeout'))) {
        updateParticipantStatus(participantId, 'Offline');
      } else if (result.challengeResults) {
        const hasErrors = result.challengeResults.some((cr: any) => cr.checks?.some((c: any) => c.error && c.error !== 'Output did not match expected patterns'));
        updateParticipantStatus(participantId, hasErrors ? 'Issues' : 'Online');

        for (const cr of result.challengeResults) {
          if (cr.passed && cr.points > 0) {
            updateParticipantScore(participantId, cr.challengeId, cr.points, 'router-scanner-secret-token');
          } else if (!cr.passed) {
            // Configuration changed to wrong — reduce points to 0
            updateParticipantScore(participantId, cr.challengeId, 0, 'router-scanner-secret-token');
          }
        }
      }
    }
  };

  const handleStartCheck = async () => {
    setCheckError('');
    setIsCheckRunning(true);

    const participants = state.participants.map(p => ({
      id: p.id,
      name: p.name,
      routerIp: p.routerIp,
      routerNumber: p.routerNumber
    }));

    try {
      const res = await fetch(`${BACKEND_URL}/api/check-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ participants })
      });

      if (!res.ok) {
        const err = await res.json();
        setCheckError(err.error || 'Failed to start checks');
        setIsCheckRunning(false);
        return;
      }

      startPolling();
    } catch (err) {
      setCheckError('Backend холбогдох боломжгүй. Backend ажиллаж байгаа эсэхийг шалгана уу.');
      setIsCheckRunning(false);
    }
  };

  const handleCheckSingleParticipant = async (participantId: string) => {
    const participant = state.participants.find(p => p.id === participantId);
    if (!participant) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/check-participant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          participantId: participant.id,
          routerIp: participant.routerIp,
          name: participant.name,
          routerNumber: participant.routerNumber
        })
      });

      const result: CheckResult = await res.json();
      setCheckStatus(prev => ({
        running: false,
        startedAt: prev?.startedAt || new Date().toISOString(),
        completedAt: new Date().toISOString(),
        progress: prev?.progress || { completed: 1, total: 1 },
        results: {
          ...(prev?.results || {}),
          [participantId]: result
        }
      }));

      // Apply scores
      if (result.challengeResults) {
        for (const cr of result.challengeResults) {
          if (cr.passed && cr.points > 0) {
            updateParticipantScore(participantId, cr.challengeId, cr.points, 'router-scanner-secret-token');
          } else if (!cr.passed) {
            // Configuration changed to wrong — reduce points to 0
            updateParticipantScore(participantId, cr.challengeId, 0, 'router-scanner-secret-token');
          }
        }
      }
    } catch (err) {
      console.error('Single check error:', err);
    }
  };

  // Ping all EVE connections to check real status
  const handlePingAll = async () => {
    setIsPinging(true);
    try {
      const participants = state.participants.map(p => ({
        id: p.id,
        routerIp: p.routerIp
      }));

      const res = await fetch(`${BACKEND_URL}/api/ping-all`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ participants })
      });

      if (!handleApiResponse(res)) return;
      if (res.ok) {
        const data = await res.json();
        for (const [participantId, result] of Object.entries(data.results) as [string, any][]) {
          updateParticipantStatus(participantId, result.status === 'Online' ? 'Online' : 'Offline');
        }
        setLastPingTime(data.checkedAt);
      }
    } catch (err) {
      console.error('Ping error:', err);
    }
    setIsPinging(false);
  };

  // Auto-ping every 60 seconds (runs regardless of active tab)
  useEffect(() => {
    if (!state.isAdminAuthenticated) return;

    handlePingAll();
    const interval = setInterval(handlePingAll, 60000);
    return () => clearInterval(interval);
  }, [state.isAdminAuthenticated]);

  const handleToggleAutoCheck = async () => {
    try {
      if (autoCheckEnabled) {
        await fetch(`${BACKEND_URL}/api/auto-check/stop`, {
          method: 'POST',
          headers: getAuthHeaders()
        });
        setAutoCheckEnabled(false);
        setAutoCheckInfo(prev => prev ? { ...prev, nextRunAt: null } : null);
      } else {
        const participants = state.participants.map(p => ({
          id: p.id,
          name: p.name,
          routerIp: p.routerIp,
          routerNumber: p.routerNumber
        }));

        const res = await fetch(`${BACKEND_URL}/api/auto-check/start`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ participants })
        });

        if (res.ok) {
          const data = await res.json();
          setAutoCheckEnabled(true);
          setAutoCheckInfo(prev => ({
            ...(prev || { lastAutoRunAt: null, runCount: 0 }),
            nextRunAt: data.nextRunAt,
            participantCount: data.participantCount,
            intervalMinutes: data.intervalMinutes
          }));
        }
      }
    } catch (err) {
      console.error('Auto-check toggle error:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await loginAdmin(passkey);
    if (success) {
      setLoginError(false);
      setPasskey('');
    } else {
      setLoginError(true);
    }
  };

  const handleStateChange = async (newState: CompetitionState) => {
    setCompetitionState(newState);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    if (!regName || !regOrg || !regRouter || !regIp || !regCategory) return;

    if (regCategory === 'Engineer') {
      const engCount = state.participants.filter(p => p.category === 'Engineer').length;
      if (engCount >= 10) {
        setRegError('Инженер бүртгэх хязгаар (10) хүрсэн байна!');
        return;
      }
    } else {
      const stdCount = state.participants.filter(p => p.category === 'Student').length;
      if (stdCount >= 20) {
        setRegError('Оюутан бүртгэх хязгаар (20) хүрсэн байна!');
        return;
      }
    }

    addParticipant({
      name: regName,
      organization: regOrg,
      category: regCategory,
      routerNumber: regRouter,
      routerIp: regIp,
      status: 'Offline'
    });

    setRegSuccess(true);
    setRegName('');
    setRegOrg('');
    setRegRouter('');
    setRegIp('');
    setTimeout(() => setRegSuccess(false), 3000);
  };

  const { updateTask } = useAppContext();

  const handleAddHint = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hintSelectedTask || !hintContent) return;

    const taskToUpdate = state.tasks.find(t => t.id === hintSelectedTask);
    if (taskToUpdate) {
      const newHint = {
        id: `h_${Date.now()}`,
        content: hintContent
      };

      const updatedTask = {
        ...taskToUpdate,
        hints: [...taskToUpdate.hints, newHint]
      };

      updateTask(updatedTask);
      setHintSuccess(true);
      setHintContent('');
      setTimeout(() => setHintSuccess(false), 3000);
    }
  };

  if (!state.isAdminAuthenticated) {
    return (
      <div className="space-y-6 pb-10 max-w-sm mx-auto mt-20">
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-cyber-accent/10 border border-cyber-accent/30 rounded-full flex items-center justify-center mb-6">
             <Lock className="w-8 h-8 text-cyber-accent" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-widest uppercase mb-1">Restricted Area</h2>
          <p className="text-xs text-cyber-text-muted font-mono mb-8 text-center">Authentication required for Control Center access.</p>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            <div>
               <input
                type="password"
                required
                className={cn("w-full bg-black/40 border rounded-lg p-3 text-white focus:outline-none transition-colors font-mono tracking-[0.25em] text-center", loginError ? "border-cyber-danger focus:border-cyber-danger" : "border-cyber-border focus:border-cyber-accent")}
                placeholder="PASSKEY"
                value={passkey}
                onChange={e => {
                  setPasskey(e.target.value);
                  setLoginError(false);
                }}
              />
              {loginError && <p className="text-[10px] text-cyber-danger uppercase font-mono mt-2 text-center">Invalid Credentials</p>}
            </div>

            <button
              type="submit"
              className="w-full p-3 bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent rounded-lg font-bold font-mono tracking-widest uppercase hover:bg-cyber-accent hover:text-black transition-all"
            >
              Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const resultEntries = checkStatus ? Object.values(checkStatus.results) : [];
  const sortedResults = [...resultEntries].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

  return (
    <div className="space-y-6 pb-10 max-w-6xl mx-auto">
      <header className="flex justify-between items-center border-b border-cyber-border pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-cyber-danger/10 rounded-xl text-cyber-danger">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Control Center</h1>
            <p className="text-cyber-text-muted">Restricted Access: Olympiad Administrators Only</p>
          </div>
        </div>
        <button
          onClick={logoutAdmin}
          className="px-4 py-2 flex items-center gap-2 border border-cyber-border text-cyber-text-muted hover:text-white hover:border-white/30 rounded transition-colors text-sm font-mono uppercase"
        >
          <LogOut className="w-4 h-4" /> Exit
        </button>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-cyber-border mb-6">
        <button
          className={cn("px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2", activeTab === 'control' ? "border-cyber-accent text-cyber-accent" : "border-transparent text-cyber-text-muted hover:text-white")}
          onClick={() => setActiveTab('control')}
        >
          <div className="flex items-center gap-2"><Settings className="w-4 h-4" /> Тэмцээний төлөв</div>
        </button>
        <button
          className={cn("px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2", activeTab === 'register' ? "border-cyber-accent text-cyber-accent" : "border-transparent text-cyber-text-muted hover:text-white")}
          onClick={() => setActiveTab('register')}
        >
           <div className="flex items-center gap-2"><UserPlus className="w-4 h-4" /> Оролцогч нэмэх</div>
        </button>
        <button
          className={cn("px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2", activeTab === 'hints' ? "border-cyber-accent text-cyber-accent" : "border-transparent text-cyber-text-muted hover:text-white")}
          onClick={() => setActiveTab('hints')}
        >
           <div className="flex items-center gap-2"><FileEdit className="w-4 h-4" /> Санамж өгөх</div>
        </button>
        <button
          className={cn("px-6 py-3 font-mono text-sm uppercase tracking-wider transition-colors border-b-2", activeTab === 'diagnostics' ? "border-cyber-accent text-cyber-accent" : "border-transparent text-cyber-text-muted hover:text-white")}
          onClick={() => setActiveTab('diagnostics')}
        >
           <div className="flex items-center gap-2"><Activity className="w-4 h-4" /> Оношилгоо</div>
        </button>
      </div>

      {activeTab === 'control' && (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Competition State Buttons */}
          <div className="glass-panel p-6 rounded-xl border border-cyber-accent/20">
            <h2 className="text-lg font-mono text-white mb-6 uppercase tracking-widest">Тэмцээний явц</h2>

            <div className="flex flex-col md:flex-row gap-4">
              <button
                onClick={() => handleStateChange('NOT_STARTED')}
                className={cn("flex-1 p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all",
                  state.competitionState === 'NOT_STARTED'
                    ? "bg-cyber-warning/20 border-cyber-warning/50 text-cyber-warning shadow-[0_0_15px_rgba(255,184,0,0.2)]"
                    : "bg-black/20 border-cyber-border text-cyber-text-muted hover:border-cyber-warning/30 hover:text-cyber-warning"
                )}
              >
                <Settings className="w-8 h-8" />
                <span className="font-bold font-mono tracking-widest uppercase">Эхлээгүй</span>
                <span className="text-xs text-center opacity-70">Тохиргооны үе шат. Санамж болон бодолт хаалттай.</span>
              </button>

               <button
                onClick={() => handleStateChange('RUNNING')}
                className={cn("flex-1 p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all",
                  state.competitionState === 'RUNNING'
                    ? "bg-cyber-neon/20 border-cyber-neon/50 text-cyber-neon shadow-[0_0_15px_rgba(57,255,20,0.2)]"
                    : "bg-black/20 border-cyber-border text-cyber-text-muted hover:border-cyber-neon/30 hover:text-cyber-neon"
                )}
              >
                <Play className="w-8 h-8" />
                <span className="font-bold font-mono tracking-widest uppercase">Явагдаж байна</span>
                <span className="text-xs text-center opacity-70">Тэмцээн эхэлсэн. Санамж нээлттэй. Оноо бодогдоно.</span>
              </button>

              <button
                onClick={() => handleStateChange('FINISHED')}
                className={cn("flex-1 p-6 rounded-xl border flex flex-col items-center justify-center gap-3 transition-all",
                  state.competitionState === 'FINISHED'
                    ? "bg-cyber-danger/20 border-cyber-danger/50 text-cyber-danger shadow-[0_0_15px_rgba(255,0,60,0.2)]"
                    : "bg-black/20 border-cyber-border text-cyber-text-muted hover:border-cyber-danger/30 hover:text-cyber-danger"
                )}
              >
                <Square className="w-8 h-8" />
                <span className="font-bold font-mono tracking-widest uppercase">Дууссан</span>
                <span className="text-xs text-center opacity-70">Оноо зогсоно. Зөв бодолтууд нээгдэнэ.</span>
              </button>
            </div>
          </div>

          {/* Check All Environments */}
          <div className="glass-panel p-6 rounded-xl border border-cyan-500/20">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-mono text-white uppercase tracking-widest">Орчин шалгах</h2>
              <button
                onClick={handleStartCheck}
                disabled={isCheckRunning}
                className={cn(
                  "px-6 py-3 rounded-lg font-bold font-mono tracking-widest uppercase flex items-center gap-2 transition-all",
                  isCheckRunning
                    ? "bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed"
                    : "bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent hover:bg-cyber-accent hover:text-black"
                )}
              >
                {isCheckRunning ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Шалгаж байна...</>
                ) : (
                  <><RefreshCw className="w-5 h-5" /> Бүгдийг шалгах</>
                )}
              </button>
            </div>

            {checkError && (
              <div className="p-3 mb-4 border border-cyber-danger/50 bg-cyber-danger/10 text-cyber-danger rounded-lg text-sm flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0" /> {checkError}
              </div>
            )}

            {/* Progress */}
            {checkStatus && (checkStatus.running || checkStatus.completedAt) && (
              <div className="mb-6">
                <div className="flex justify-between text-xs font-mono text-cyber-text-muted mb-2">
                  <span>Явц: {checkStatus.progress.completed}/{checkStatus.progress.total}</span>
                  <span>{checkStatus.running ? 'Шалгаж байна...' : 'Дууссан'}</span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500", checkStatus.running ? "bg-cyber-accent animate-pulse" : "bg-cyber-neon")}
                    style={{ width: `${checkStatus.progress.total > 0 ? (checkStatus.progress.completed / checkStatus.progress.total * 100) : 0}%` }}
                  />
                </div>
              </div>
            )}

            {/* Results Table */}
            {sortedResults.length > 0 && (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {/* Header */}
                <div className="grid grid-cols-[40px_1fr_120px_80px_80px_40px] gap-2 px-3 py-2 text-[10px] font-mono text-cyber-text-muted uppercase tracking-wider border-b border-cyber-border">
                  <span>#</span>
                  <span>Оролцогч</span>
                  <span>EVE IP</span>
                  <span>Оноо</span>
                  <span>Төлөв</span>
                  <span></span>
                </div>

                {sortedResults.map((result, idx) => {
                  const isExpanded = expandedParticipant === result.participantId;
                  const passedCount = result.challengeResults?.filter(c => c.passed).length || 0;
                  const totalChallenges = result.challengeResults?.length || 0;

                  return (
                    <div key={result.participantId} className="border border-cyber-border/50 rounded-lg overflow-hidden">
                      <div
                        className={cn(
                          "grid grid-cols-[40px_1fr_120px_80px_80px_40px] gap-2 px-3 py-2.5 items-center cursor-pointer hover:bg-white/5 transition-colors",
                          result.error ? "bg-red-500/5" : passedCount === totalChallenges ? "bg-green-500/5" : ""
                        )}
                        onClick={() => setExpandedParticipant(isExpanded ? null : result.participantId)}
                      >
                        <span className="text-xs font-mono text-cyber-text-muted">{idx + 1}</span>
                        <div>
                          <span className="text-sm text-white font-medium">{result.participantName}</span>
                          <span className="text-[10px] text-cyber-text-muted ml-2 font-mono">{result.routerNumber}</span>
                        </div>
                        <span className="text-xs font-mono text-cyan-400">{result.routerIp}</span>
                        <span className="text-sm font-bold font-mono text-cyber-accent">
                          {result.totalScore || 0}/{result.maxScore || 0}
                        </span>
                        <span className="text-[10px] font-mono">
                          {result.error ? (
                            <span className="text-cyber-danger">ERROR</span>
                          ) : (
                            <span className={passedCount === totalChallenges ? "text-cyber-neon" : "text-cyber-warning"}>
                              {passedCount}/{totalChallenges}
                            </span>
                          )}
                        </span>
                        <span className="text-cyber-text-muted">
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </div>

                      {/* Expanded Challenge Details */}
                      {isExpanded && result.challengeResults && (
                        <div className="border-t border-cyber-border/30 bg-black/20 px-4 py-3 space-y-1.5">
                          <div className="flex justify-end mb-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleCheckSingleParticipant(result.participantId); }}
                              className="text-[10px] px-3 py-1 border border-cyber-accent/30 text-cyber-accent rounded hover:bg-cyber-accent/10 font-mono uppercase flex items-center gap-1"
                            >
                              <RefreshCw className="w-3 h-3" /> Дахин шалгах
                            </button>
                          </div>
                          {result.challengeResults.map(cr => {
                            const isChallengeExpanded = expandedChallenge === `${result.participantId}-${cr.challengeId}`;
                            return (
                              <div key={cr.challengeId} className="border border-cyber-border/20 rounded">
                                <div
                                  className={cn(
                                    "flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-white/5",
                                    cr.passed ? "bg-green-500/5" : "bg-red-500/5"
                                  )}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedChallenge(isChallengeExpanded ? null : `${result.participantId}-${cr.challengeId}`);
                                  }}
                                >
                                  <span className={cn("w-5 h-5 shrink-0", cr.passed ? "text-cyber-neon" : "text-cyber-danger")}>
                                    {cr.passed ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                                  </span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 font-mono uppercase">{cr.subCategory}</span>
                                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/20 text-slate-400 font-mono uppercase">{cr.category}</span>
                                    </div>
                                    <p className="text-xs text-white truncate mt-0.5">{cr.description}</p>
                                  </div>
                                  <span className="text-xs font-mono font-bold text-white shrink-0">{cr.points}/{cr.maxPoints}</span>
                                  <span className="text-cyber-text-muted shrink-0">
                                    {isChallengeExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                  </span>
                                </div>

                                {isChallengeExpanded && cr.checks && (
                                  <div className="border-t border-cyber-border/10 px-3 py-2 bg-black/30 space-y-2">
                                    {cr.checks.map((check, ci) => (
                                      <div key={ci} className="text-[10px]">
                                        <div className="flex items-center gap-2 mb-1">
                                          <span className={cn("font-mono", check.passed ? "text-cyber-neon" : "text-cyber-danger")}>
                                            {check.passed ? 'PASS' : 'FAIL'}
                                          </span>
                                          <span className="text-cyan-400 font-mono">{check.device}</span>
                                          {check.error && <span className="text-cyber-danger">{check.error}</span>}
                                        </div>
                                        {check.output && (
                                          <pre className="text-[9px] text-cyber-text-muted bg-black/50 rounded p-2 overflow-x-auto max-h-40 whitespace-pre-wrap font-mono">
                                            {check.output.substring(0, 1000)}
                                          </pre>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Auto-Check Panel */}
          <div className="glass-panel p-6 rounded-xl border border-purple-500/20">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-mono text-white uppercase tracking-widest">Автомат шалгалт</h2>
              <button
                onClick={handleToggleAutoCheck}
                className={cn(
                  "px-6 py-3 rounded-lg font-bold font-mono tracking-widest uppercase flex items-center gap-2 transition-all",
                  autoCheckEnabled
                    ? "bg-cyber-danger/20 border border-cyber-danger/50 text-cyber-danger hover:bg-cyber-danger hover:text-white"
                    : "bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500 hover:text-white"
                )}
              >
                {autoCheckEnabled ? (
                  <><XCircle className="w-5 h-5" /> Зогсоох</>
                ) : (
                  <><RefreshCw className="w-5 h-5" /> 30 мин идэвхжүүлэх</>
                )}
              </button>
            </div>

            <p className="text-xs text-cyber-text-muted mb-4">
              30 минут тутамд бүх оролцогчдын орчинг автоматаар шалгаж оноог шинэчилнэ.
            </p>

            {autoCheckEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-black/30 border border-cyber-border rounded-lg p-4 text-center">
                  <p className="text-[10px] font-mono text-cyber-text-muted uppercase mb-1">Дараагийн шалгалт</p>
                  <p className="text-2xl font-mono font-bold text-purple-400">{countdown || '--:--'}</p>
                </div>
                <div className="bg-black/30 border border-cyber-border rounded-lg p-4 text-center">
                  <p className="text-[10px] font-mono text-cyber-text-muted uppercase mb-1">Давтамж</p>
                  <p className="text-2xl font-mono font-bold text-white">{autoCheckInfo?.intervalMinutes || 30} мин</p>
                </div>
                <div className="bg-black/30 border border-cyber-border rounded-lg p-4 text-center">
                  <p className="text-[10px] font-mono text-cyber-text-muted uppercase mb-1">Шалгасан удаа</p>
                  <p className="text-2xl font-mono font-bold text-cyber-accent">{autoCheckInfo?.runCount || 0}</p>
                </div>
                <div className="bg-black/30 border border-cyber-border rounded-lg p-4 text-center">
                  <p className="text-[10px] font-mono text-cyber-text-muted uppercase mb-1">Оролцогчид</p>
                  <p className="text-2xl font-mono font-bold text-cyber-neon">{autoCheckInfo?.participantCount || 0}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'hints' && (
        <div className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <h2 className="text-lg font-mono text-white mb-6 uppercase tracking-widest flex items-center gap-2">
             <FileEdit className="w-5 h-5" /> Санамж (Hint) нэмэх
          </h2>

          {hintSuccess ? (
            <div className="p-6 border border-cyber-neon/30 bg-cyber-neon/10 rounded-lg flex flex-col items-center justify-center text-center text-cyber-neon h-64">
              <CheckCircle2 className="w-12 h-12 mb-3" />
              <h3 className="text-xl font-bold mb-1">Санамж амжилттай нэмэгдлээ</h3>
              <p className="text-sm opacity-80">Сонгосон даалгаварт санамж орлоо.</p>
              <button
                onClick={() => setHintSuccess(false)}
                className="mt-6 px-4 py-2 border border-cyber-neon text-cyber-neon rounded hover:bg-cyber-neon/20 transition-colors font-mono text-sm uppercase"
              >
                Дахин санамж нэмэх
              </button>
            </div>
          ) : (
            <form onSubmit={handleAddHint} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Даалгавар сонгох</label>
                <select
                  required
                  className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                  value={hintSelectedTask}
                  onChange={e => setHintSelectedTask(e.target.value)}
                >
                  <option value="" disabled>Даалгавраа сонгоно уу...</option>
                  {state.tasks.map(t => (
                     <option key={t.id} value={t.id}>[{t.subCategory}] {t.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Санамжийн текст</label>
                <textarea
                  required
                  rows={4}
                  className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                  placeholder="Оролцогчдод өгөх санамжаа энд бичнэ үү..."
                  value={hintContent}
                  onChange={e => setHintContent(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="w-full mt-4 p-3 bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent rounded-lg font-bold font-mono tracking-widest uppercase hover:bg-cyber-accent hover:text-black transition-all flex items-center justify-center gap-2"
              >
                <FileEdit className="w-5 h-5" /> Санамж үүсгэх
              </button>
            </form>
          )}
        </div>
      )}

      {activeTab === 'diagnostics' && (
        <div className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-mono text-white uppercase tracking-widest">EVE холболтын төлөв</h2>
            <div className="flex items-center gap-4">
              {lastPingTime && (
                <span className="text-xs text-cyber-text-muted font-mono">
                  Сүүлд шалгасан: {new Date(lastPingTime).toLocaleTimeString()}
                </span>
              )}
              <button
                onClick={handlePingAll}
                disabled={isPinging}
                className={cn(
                  "px-4 py-2 rounded-lg font-mono text-sm uppercase flex items-center gap-2 transition-all",
                  isPinging
                    ? "bg-gray-600/30 border border-gray-500/30 text-gray-400 cursor-not-allowed"
                    : "bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent hover:bg-cyber-accent hover:text-black"
                )}
              >
                {isPinging ? <><Loader2 className="w-4 h-4 animate-spin" /> Шалгаж байна...</> : <><RefreshCw className="w-4 h-4" /> Холболт шалгах</>}
              </button>
            </div>
          </div>

          <p className="text-xs text-cyber-text-muted mb-4">EVE серверүүд рүү SSH холболт хийж бодит төлвийг шалгана. Автоматаар 60 секунд тутамд шинэчлэгдэнэ.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {state.participants.map(p => {
              const statusColor = p.status === 'Online' ? 'border-cyber-neon/40 bg-cyber-neon/5'
                : p.status === 'Offline' ? 'border-cyber-danger/40 bg-cyber-danger/5'
                : 'border-cyber-warning/40 bg-cyber-warning/5';
              const dotColor = p.status === 'Online' ? 'bg-cyber-neon'
                : p.status === 'Offline' ? 'bg-cyber-danger'
                : 'bg-cyber-warning animate-pulse';
              const textColor = p.status === 'Online' ? 'text-cyber-neon'
                : p.status === 'Offline' ? 'text-cyber-danger'
                : 'text-cyber-warning';

              return (
                <div key={p.id} className={cn("p-3 rounded-lg border flex items-center justify-between", statusColor)}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", dotColor)} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.name}</p>
                      <p className="text-[10px] font-mono text-cyber-text-muted">{p.routerNumber} &bull; {p.routerIp}</p>
                    </div>
                  </div>
                  <span className={cn("text-[10px] font-mono font-bold uppercase shrink-0", textColor)}>
                    {p.status === 'Connecting' ? 'ШАЛГААГҮЙ' : p.status === 'Online' ? 'ХОЛБОГДСОН' : 'САЛСАН'}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 flex gap-6 text-xs font-mono text-cyber-text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-neon inline-block" /> Холбогдсон: {state.participants.filter(p => p.status === 'Online').length}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-danger inline-block" /> Салсан: {state.participants.filter(p => p.status === 'Offline').length}</span>
            <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-cyber-warning inline-block" /> Шалгаагүй: {state.participants.filter(p => p.status === 'Connecting').length}</span>
          </div>
        </div>
      )}

      {activeTab === 'register' && (
        <div className="glass-panel p-6 rounded-xl animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-2xl">
          <h2 className="text-lg font-mono text-white mb-6 uppercase tracking-widest">Оролцогч бүртгэх</h2>

          {regSuccess ? (
            <div className="p-6 border border-cyber-neon/30 bg-cyber-neon/10 rounded-lg flex flex-col items-center justify-center text-center text-cyber-neon h-64">
              <CheckCircle2 className="w-12 h-12 mb-3" />
              <h3 className="text-xl font-bold mb-1">Амжилттай бүртгэлээ</h3>
              <p className="text-sm opacity-80">Тэргүүлэгчдийн самбарт шинэ оролцогч нэмэгдлээ.</p>
              <button
                onClick={() => setRegSuccess(false)}
                className="mt-6 px-4 py-2 border border-cyber-neon text-cyber-neon rounded hover:bg-cyber-neon/20 transition-colors font-mono text-sm uppercase"
              >
                Дахин бүртгэх
              </button>
            </div>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              {regError && (
                <div className="p-3 border border-cyber-danger/50 bg-cyber-danger/10 text-cyber-danger rounded-lg text-sm text-center">
                  {regError}
                </div>
              )}

              <div>
                <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Ангилал</label>
                <select
                  required
                  className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                  value={regCategory}
                  onChange={e => setRegCategory(e.target.value as ParticipantCategory)}
                >
                  <option value="Engineer">Инженер (Макс 10)</option>
                  <option value="Student">Оюутан (Макс 20)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Нэр</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                  placeholder="Жишээ нь: Бат-Эрдэнэ"
                  value={regName}
                  onChange={e => setRegName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Байгууллага/Сургууль</label>
                <input
                  type="text"
                  required
                  className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors"
                  placeholder="Жишээ нь: МУИС"
                  value={regOrg}
                  onChange={e => setRegOrg(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">Router ID</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                    placeholder="Жишээ нь: R13"
                    value={regRouter}
                    onChange={e => setRegRouter(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-cyber-text-muted uppercase tracking-wider mb-2">IP Хаяг</label>
                  <input
                    type="text"
                    required
                    className="w-full bg-black/40 border border-cyber-border rounded-lg p-3 text-white focus:outline-none focus:border-cyber-accent transition-colors font-mono"
                    placeholder="10.16.16.x"
                    value={regIp}
                    onChange={e => setRegIp(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  className="w-full p-4 bg-cyber-accent/20 border border-cyber-accent/50 text-cyber-accent rounded-lg font-bold font-mono tracking-widest uppercase hover:bg-cyber-accent mt-2 hover:text-black transition-all flex justify-center items-center gap-2"
                >
                  <Server className="w-5 h-5" /> Бүртгэх
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
};
