import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ArrowLeft, Server, Activity, ShieldAlert, CheckCircle2, XCircle, Terminal, CheckSquare } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { TaskScore } from '../types';

export const ParticipantDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();

  const participant = state.participants.find(p => p.id === id);
  const diagnostic = state.diagnostics.find(d => d.participantId === id);

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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-2 space-y-6">
          {/* Tasks Breakdown */}
          <div className="glass-panel p-6 rounded-xl">
            <h2 className="text-lg font-mono text-cyber-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-cyber-accent" /> Validated Configurations
            </h2>
            <div className="space-y-4">
              {state.tasks.map(task => {
                const scoreRecord = participant.taskScores.find(ts => ts.taskId === task.id);
                const isSolved = !!scoreRecord;
                return (
                  <div key={task.id} className={cn("p-4 rounded-lg border flex items-center justify-between", isSolved ? "bg-cyber-neon/5 border-cyber-neon/30" : "bg-black/20 border-cyber-border")}>
                    <div className="flex items-center gap-4">
                      {isSolved ? <CheckCircle2 className="w-6 h-6 text-cyber-neon flex-shrink-0" /> : <XCircle className="w-6 h-6 text-cyber-text-muted opacity-50 flex-shrink-0" />}
                      <div>
                        <p className={cn("font-medium", isSolved ? "text-white" : "text-cyber-text-muted")}>{task.title}</p>
                        <p className="text-xs font-mono text-cyber-text-muted mt-1">{task.category} &bull; {task.difficulty}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {isSolved ? (
                        <>
                          <div className="font-mono text-cyber-neon font-bold">+{scoreRecord.score}</div>
                          <div className="text-[10px] text-cyber-text-muted mt-1">{formatDate(scoreRecord.completedAt)}</div>
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

        {/* Diagnostics Side Panel */}
        <div className="space-y-6">
          <div className="glass-panel rounded-xl overflow-hidden">
            <div className="p-4 border-b border-cyber-border bg-cyber-card-hover flex items-center gap-2">
              <Activity className="w-5 h-5 text-cyber-warning" />
              <h3 className="font-medium font-mono uppercase tracking-widest text-sm">Router Telemetry</h3>
            </div>
            
            {diagnostic ? (
              <div className="p-5 space-y-5">
                <div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-cyber-text-muted">Reachability</span>
                    <span className={diagnostic.isReachable ? "text-cyber-neon" : "text-cyber-danger"}>{diagnostic.isReachable ? 'REACHABLE' : 'UNREACHABLE'}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-cyber-text-muted">Overall Health</span>
                    <span className={
                      diagnostic.status === 'Healthy' ? 'text-cyber-neon' :
                      diagnostic.status === 'Degraded' ? 'text-cyber-warning' : 'text-cyber-danger'
                    }>{diagnostic.status.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between text-sm mb-2 font-mono">
                    <span className="text-cyber-text-muted">Last Check</span>
                    <span className="text-white">{formatDate(diagnostic.lastCheck)}</span>
                  </div>
                </div>

                <div className="border-t border-cyber-border pt-4">
                  <h4 className="text-xs uppercase text-cyber-text-muted font-mono mb-3">Protocol Status</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(diagnostic.protocolsStatus).map(([proto, status]) => (
                      <div key={proto} className="bg-black/30 p-2 rounded flex justify-between items-center text-sm font-mono">
                        <span className="text-cyber-text-muted">{proto}</span>
                        <span className={status === 'Up' ? 'text-cyber-neon' : 'text-cyber-danger'}>{status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-cyber-border pt-4">
                  <h4 className="text-xs uppercase text-cyber-text-muted font-mono mb-3">Service Scan</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(diagnostic.servicesReachable).map(([service, reachable]) => (
                      <span key={service} className={cn("px-2 py-1 text-xs rounded border font-mono", reachable ? "border-cyber-neon/30 text-cyber-neon bg-cyber-neon/5" : "border-cyber-danger/30 text-cyber-danger bg-cyber-danger/5")}>
                        {service}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-cyber-text-muted text-sm font-mono">
                <ShieldAlert className="w-8 h-8 mx-auto mb-2 opacity-50" />
                No telemetry available for this asset.
              </div>
            )}
          </div>

          <div className="glass-panel rounded-xl overflow-hidden flex flex-col h-[300px]">
             <div className="p-3 border-b border-cyber-border bg-[#0a0a0a] flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyber-text-muted" />
              <h3 className="font-mono text-xs uppercase tracking-widest text-cyber-text-muted">Live Diagnostics Log</h3>
            </div>
            <div className="p-4 bg-[#050505] flex-1 overflow-y-auto font-mono text-xs space-y-2">
              {diagnostic?.logs.map(log => (
                <div key={log.id} className="flex gap-2">
                  <span className="text-cyber-text-muted flex-shrink-0">[{log.timestamp.split('T')[1].split('Z')[0]}]</span>
                  <span className={cn(
                    log.level === 'SUCCESS' ? 'text-cyber-neon' :
                    log.level === 'ERROR' ? 'text-cyber-danger' :
                    log.level === 'WARN' ? 'text-cyber-warning' : 'text-blue-400'
                  )}>{log.message}</span>
                </div>
              ))}
              {!diagnostic?.logs?.length && <div className="text-cyber-text-muted opacity-50">Waiting for diagnostic streams...</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
