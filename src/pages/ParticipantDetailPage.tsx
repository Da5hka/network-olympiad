import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ArrowLeft, Server, CheckCircle2, XCircle, CheckSquare } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';

export const ParticipantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();

  const participant = state.participants.find(p => p.id === id);

  if (!participant) {
    return <div className="text-cyber-danger p-6 text-center">Participant non-existent or data corrupted.</div>;
  }

  return (
    <div className="space-y-8 pb-10">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-cyber-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Registry
      </button>

      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 glass-panel p-6 rounded-xl border border-cyber-accent/20 bg-cyber-accent/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-3 opacity-10">
          <Server className="w-32 h-32" />
        </div>
        
        <div className="relative z-10 w-full">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{participant.name}</h1>
              <p className="text-cyber-text-muted text-lg">{participant.organization}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase font-mono tracking-wider text-cyber-text-muted mb-1">Total Score</p>
              <p className="text-5xl font-mono font-bold text-cyber-accent shadow-sm">{participant.totalScore}</p>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-4 mt-6">
            <div className="bg-cyber-card px-4 py-2 rounded-md border border-cyber-border/50 text-sm font-mono flex items-center gap-2">
              <span className="text-cyber-text-muted">Target ID:</span> <span className="text-white">{participant.routerNumber}</span>
            </div>
            <div className="bg-cyber-card px-4 py-2 rounded-md border border-cyber-border/50 text-sm font-mono flex items-center gap-2">
              <span className="text-cyber-text-muted">IPv4:</span> <span className="text-white">{participant.routerIp}</span>
            </div>
            <div className="bg-cyber-card px-4 py-2 rounded-md border border-cyber-border/50 text-sm font-mono flex items-center gap-2">
              <span className="text-cyber-text-muted">Status:</span> 
              <span className={cn('font-bold', 
                participant.status === 'Online' ? 'text-cyber-neon' : 
                participant.status === 'Issues' ? 'text-cyber-danger' : 
                participant.status === 'Connecting' ? 'text-cyber-warning' : 'text-cyber-text-muted'
              )}>
                {participant.status.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-6">
        {/* Tasks Breakdown */}
        <div className="glass-panel p-6 rounded-xl">
          <h2 className="text-lg font-mono text-cyber-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-cyber-accent" /> Validated Configurations
          </h2>
          <div className="space-y-4">
            {state.tasks.map(task => {
              const scoreRecord = participant.taskScores.find(ts => ts.taskId === task.id);
              const isSolved = !!scoreRecord && scoreRecord.score > 0;
              const isFailed = !!scoreRecord && scoreRecord.score === 0;
              return (
                <div key={task.id} className={cn("p-4 rounded-lg border flex items-center justify-between",
                  isSolved ? "bg-cyber-neon/5 border-cyber-neon/30" :
                  isFailed ? "bg-red-500/10 border-red-500/30" :
                  "bg-black/20 border-cyber-border"
                )}>
                  <div className="flex items-center gap-4">
                    {isSolved ? <CheckCircle2 className="w-6 h-6 text-cyber-neon flex-shrink-0" /> : <XCircle className={cn("w-6 h-6 flex-shrink-0", isFailed ? "text-red-500" : "text-cyber-text-muted opacity-50")} />}
                    <div>
                      <p className={cn("font-medium", isSolved ? "text-white" : isFailed ? "text-red-400" : "text-cyber-text-muted")}>{task.title}</p>
                      <p className="text-xs font-mono text-cyber-text-muted mt-1">{task.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {isSolved ? (
                      <>
                        <div className="font-mono text-cyber-neon font-bold">+{scoreRecord.score}</div>
                        <div className="text-[10px] text-cyber-text-muted mt-1">{formatDate(scoreRecord.completedAt)}</div>
                      </>
                    ) : isFailed ? (
                      <>
                        <div className="font-mono text-red-500 font-bold">0 / {task.maxScore}</div>
                        <div className="text-[10px] text-cyber-text-muted mt-1">{formatDate(scoreRecord!.completedAt)}</div>
                      </>
                    ) : (
                      <div className="font-mono text-cyber-text-muted">-- / {task.maxScore}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
