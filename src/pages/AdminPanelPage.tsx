import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { ShieldAlert, Play, Square, Settings, UserPlus, FileEdit, CheckCircle2, Server, LogOut, Lock, Activity } from 'lucide-react';
import { cn } from '../lib/utils';
import { CompetitionState, ParticipantCategory } from '../types';
import { RouterDiagnosticsPage } from './RouterDiagnosticsPage';

export const AdminPanelPage: React.FC = () => {
  const { state, setCompetitionState, addParticipant, loginAdmin, logoutAdmin } = useAppContext();
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

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginAdmin(passkey)) {
      setLoginError(false);
      setPasskey('');
    } else {
      setLoginError(true);
    }
  };

  const handleStateChange = (newState: CompetitionState) => {
    // In a real app, this would be an API call
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

          <div className="mt-6 border-t border-cyber-border/50 w-full pt-4 text-center">
            <p className="text-[10px] text-cyber-text-muted font-mono">Demo mode password: <span className="text-white select-all">admin2026</span></p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-10 max-w-5xl mx-auto">
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
                     <option key={t.id} value={t.id}>{t.title}</option>
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
           <RouterDiagnosticsPage />
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
                    placeholder="172.16.x.x"
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
