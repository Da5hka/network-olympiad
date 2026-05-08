import React from 'react';
import { useAppContext } from '../store/AppContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Users, Download, FileText, Table } from 'lucide-react';
import { cn } from '../lib/utils';
import { TaskCategory } from '../types';
import topologyPdf from '../download/topology.pdf';
import ipv4Plan from '../download/Copy of IPv4 address plan.xlsx';
import ipv6Plan from '../download/Copy of IPv6 address plan.xlsx';

export const TasksPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  const getCategoryColor = (category: TaskCategory) => {
    switch (category) {
      case 'Troubleshooting': return 'bg-orange-500/20 text-orange-400';
      case 'Implementation': return 'bg-blue-500/20 text-blue-400';
      case 'Service': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const areWriteupsVisible = state.competitionState === 'FINISHED';

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Сүлжээний даалгаврууд</h1>
          <p className="text-cyber-text-muted">Тохиргоо болон алдааг олж засварлах даалгаврууд</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyber-card border border-cyber-border text-sm">
            {areWriteupsVisible ? (
              <><Unlock className="w-4 h-4 text-cyber-neon" /> <span className="text-cyber-neon">Бодолт нээлттэй</span></>
            ) : (
              <><Lock className="w-4 h-4 text-cyber-warning" /> <span className="text-cyber-warning">Бодолт түгжигдсэн</span></>
            )}
          </div>
        </div>
      </header>

      {/* GUIDE - Download files */}
      <div className="glass-panel p-4 rounded-xl">
        <h2 className="text-sm font-mono text-cyber-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
          <Download className="w-4 h-4 text-cyber-accent" /> GUIDE
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <a href={topologyPdf} download="topology.pdf" className="flex items-center gap-3 p-3 rounded-lg border border-cyber-border bg-black/20 hover:bg-cyber-accent/10 hover:border-cyber-accent/50 transition-all group">
            <FileText className="w-8 h-8 text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-cyber-accent transition-colors">Topology</p>
              <p className="text-[10px] text-cyber-text-muted">PDF</p>
            </div>
          </a>
          <a href={ipv4Plan} download="IPv4 address plan.xlsx" className="flex items-center gap-3 p-3 rounded-lg border border-cyber-border bg-black/20 hover:bg-cyber-accent/10 hover:border-cyber-accent/50 transition-all group">
            <Table className="w-8 h-8 text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-cyber-accent transition-colors">IPv4 Address Plan</p>
              <p className="text-[10px] text-cyber-text-muted">XLSX</p>
            </div>
          </a>
          <a href={ipv6Plan} download="IPv6 address plan.xlsx" className="flex items-center gap-3 p-3 rounded-lg border border-cyber-border bg-black/20 hover:bg-cyber-accent/10 hover:border-cyber-accent/50 transition-all group">
            <Table className="w-8 h-8 text-blue-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white group-hover:text-cyber-accent transition-colors">IPv6 Address Plan</p>
              <p className="text-[10px] text-cyber-text-muted">XLSX</p>
            </div>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {state.tasks.map(task => (
           <div
            key={task.id}
            className="glass-panel p-3 rounded-2xl flex flex-col gap-2 relative overflow-hidden group hover:bg-white/10 hover:border-cyber-accent/50 transition-all cursor-pointer"
            onClick={() => navigate(`/tasks/${task.id}`)}
          >
            <div className="flex justify-between items-center bg-black/20 p-2 rounded-lg border border-white/5 group-hover:border-cyber-accent/20 transition-colors">
              <div className="flex gap-1.5">
                <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold uppercase", getCategoryColor(task.category))}>
                  {task.category}
                </span>
              </div>
              <span className="text-xs font-bold font-mono text-white group-hover:text-cyber-accent transition-colors">{task.maxScore} pts</span>
            </div>

            <div className="p-2 space-y-1">
              <h4 className="text-sm font-bold text-white group-hover:text-cyber-accent transition-colors truncate">{task.title}</h4>
              <p className="text-xs text-cyber-text-muted line-clamp-3">{task.description}</p>
            </div>

            <div className="px-2 flex gap-2 items-center text-[10px] text-cyber-text-muted">
              <span>Owner: <span className="text-white">{task.owner}</span></span>
            </div>

            <div className="mt-auto border-t border-white/5 pt-2 flex justify-between items-center px-2">
              <div className="flex gap-2 items-center">
                <span className={cn(
                  "text-[9px] flex items-center gap-1",
                   task.isAvailable ? "text-cyber-neon" : "text-cyber-text-muted"
                )}>
                  {task.isAvailable ? '● Нээлттэй' : '○ Түгжигдсэн'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                 <span className="text-[9px] text-cyber-text-muted uppercase flex items-center gap-1">
                   <Users className="w-3 h-3" /> {task.solversCount} Бодолт
                 </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
