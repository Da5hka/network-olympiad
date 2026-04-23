import React from 'react';
import { useAppContext } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { Database, Lock, Unlock, Network, Shield, Settings, ServerCrash, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskCategory } from '../types';

export const TasksPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  const getCategoryIcon = (category: TaskCategory) => {
    switch (category) {
      case 'Routing': return <Network className="w-5 h-5 text-blue-400" />;
      case 'Security': return <Shield className="w-5 h-5 text-red-400" />;
      case 'Switching': return <Database className="w-5 h-5 text-green-400" />;
      case 'Services': return <Settings className="w-5 h-5 text-purple-400" />;
      case 'Troubleshooting': return <ServerCrash className="w-5 h-5 text-orange-400" />;
      default: return <Database className="w-5 h-5 text-gray-400" />;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch(difficulty) {
      case 'Easy': return 'text-green-400 border-green-400/30 bg-green-400/5';
      case 'Medium': return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/5';
      case 'Hard': return 'text-orange-400 border-orange-400/30 bg-orange-400/5';
      case 'Expert': return 'text-red-400 border-red-400/30 bg-red-400/5';
      default: return 'text-gray-400 border-gray-400/30 bg-gray-400/5';
    }
  };

  const areWriteupsVisible = state.competitionState === 'FINISHED';

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Network Scenarios</h1>
          <p className="text-cyber-text-muted">Configuration and troubleshooting challenges</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-card border border-cyber-border text-sm">
            {areWriteupsVisible ? (
              <><Unlock className="w-4 h-4 text-cyber-neon" /> <span className="text-cyber-neon">Writeups Unlocked</span></>
            ) : (
              <><Lock className="w-4 h-4 text-cyber-warning" /> <span className="text-cyber-warning">Writeups Locked</span></>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {state.tasks.map(task => (
           <div 
            key={task.id} 
            className="glass-panel p-3 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:bg-white/10 hover:border-cyber-accent/50 transition-all cursor-pointer"
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 group-hover:border-cyber-accent/20 transition-colors">
              <span className={cn(
                "text-[10px] px-2 py-0.5 rounded font-bold uppercase",
                task.category === 'Routing' ? 'bg-blue-500/20 text-blue-400' :
                task.category === 'Security' ? 'bg-purple-500/20 text-purple-400' :
                task.category === 'Switching' ? 'bg-emerald-500/20 text-emerald-400' :
                'bg-slate-500/20 text-slate-400'
              )}>
                {task.category}
              </span>
              <span className="text-xs font-bold font-mono text-white group-hover:text-cyber-accent transition-colors">{task.maxScore} pts</span>
            </div>
            
            <div className="p-2 space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-cyber-accent transition-colors truncate">{task.title}</h4>
              <p className="text-[10px] text-cyber-text-muted line-clamp-2">{task.description}</p>
            </div>
            
            <div className="mt-auto border-t border-white/5 pt-2 flex justify-between items-center px-2">
              <div className="flex gap-2 items-center">
                <span className={cn(
                  "text-[9px] flex items-center gap-1",
                   task.isAvailable ? "text-cyber-neon" : "text-cyber-text-muted"
                )}>
                  {task.isAvailable ? '● Available' : '○ Locked'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] text-cyber-text-muted uppercase flex items-center gap-1">
                   <Users className="w-3 h-3" /> {task.solversCount} Solves
                 </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
