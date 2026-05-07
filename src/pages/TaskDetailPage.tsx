import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../store/AppContext';
import { ArrowLeft, Lock, Unlock, Zap, Server, ChevronDown, ChevronUp, AlertCircle, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import Markdown from 'react-markdown';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state } = useAppContext();
  
  const [expandedHints, setExpandedHints] = useState<Record<string, boolean>>({});

  const task = state.tasks.find(t => t.id === id);

  if (!task) {
    return <div className="text-cyber-danger p-6 text-center">Problem data missing or corrupted.</div>;
  }

  const areWriteupsVisible = state.competitionState === 'FINISHED';
  const areHintsAvailable = state.competitionState === 'RUNNING';

  const toggleHint = (hintId: string) => {
    if (!areHintsAvailable) return;
    setExpandedHints(prev => ({ ...prev, [hintId]: !prev[hintId] }));
  };

  return (
    <div className="space-y-8 pb-10 max-w-4xl mx-auto">
      <button 
        onClick={() => navigate(-1)} 
        className="flex items-center gap-2 text-cyber-text-muted hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Scenarios
      </button>

      <div className="glass-panel rounded-xl overflow-hidden">
        <header className="p-8 border-b border-cyber-border bg-gradient-to-br from-cyber-card to-cyber-bg relative">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <Server className="w-48 h-48" />
          </div>
          <div className="relative z-10">
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="px-3 py-1 rounded bg-black/40 border border-cyber-border text-xs font-mono uppercase tracking-widest text-cyber-text-muted">{task.category}</span>
              <span className="px-3 py-1 rounded bg-black/40 border border-cyber-border text-xs font-mono uppercase tracking-widest text-cyber-text-muted">Owner: {task.owner}</span>
            </div>
            <div className="flex justify-between items-start">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-2">{task.title}</h1>
              <div className="text-right">
                <p className="text-4xl font-mono font-bold text-cyber-accent filter drop-shadow-[0_0_10px_rgba(0,240,255,0.4)]">{task.maxScore}</p>
                <p className="text-xs font-mono text-cyber-text-muted uppercase tracking-widest mt-1">Points</p>
              </div>
            </div>
            <p className="mt-4 text-cyber-text-muted flex items-center gap-2 font-mono text-sm">
              <Zap className="w-4 h-4 text-cyber-warning" /> {task.scoreValueHint}
            </p>
          </div>
        </header>

        <div className="p-8 space-y-8">
          <section className="mb-10">
            <h2 className="text-lg font-mono text-white mb-4 uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyber-accent" /> Даалгаврын тайлбар
            </h2>
            <div className="text-cyber-text bg-black/20 p-6 rounded-lg border border-cyber-border leading-relaxed text-base md:text-lg">
              {task.description}
            </div>
          </section>

          <section>
             <h2 className="text-lg font-mono text-white mb-4 uppercase tracking-widest flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-cyber-warning" /> Санамж
            </h2>
            {!areHintsAvailable && state.competitionState === 'NOT_STARTED' && (
              <div className="p-4 border border-cyber-warning/30 bg-cyber-warning/5 text-cyber-warning rounded-lg text-sm flex items-center gap-2">
                <Lock className="w-4 h-4" /> Тэмцээн эхлээгүй үед санамж хаалттай байна.
              </div>
            )}
            {!areHintsAvailable && state.competitionState === 'FINISHED' && (
              <div className="p-4 border border-cyber-text-muted/30 bg-black/20 text-cyber-text-muted rounded-lg text-sm">
                Тэмцээн дууссан тул бодолт (Writeup) руу орж үзнэ үү.
              </div>
            )}
            
            {areHintsAvailable && task.hints.length === 0 && (
              <div className="p-4 border border-cyber-border bg-black/20 text-cyber-text-muted rounded-lg text-sm">
                Энэ даалгаварт санамж нэмэгдээгүй байна.
              </div>
            )}

            {areHintsAvailable && task.hints.length > 0 && (
              <div className="space-y-3">
                {task.hints.map((hint, index) => (
                  <div key={hint.id} className="border border-cyber-border rounded-lg overflow-hidden bg-cyber-card">
                    <button 
                      className="w-full p-4 flex justify-between items-center hover:bg-white/5 transition-colors text-left"
                      onClick={() => toggleHint(hint.id)}
                    >
                      <span className="font-mono text-sm text-cyber-text-muted">Санамж #{index + 1}</span>
                      {expandedHints[hint.id] ? <ChevronUp className="w-4 h-4 text-cyber-text-muted" /> : <ChevronDown className="w-4 h-4 text-cyber-text-muted" />}
                    </button>
                    {expandedHints[hint.id] && (
                      <div className="p-4 pt-0 text-sm text-cyber-text border-t border-cyber-border/50 bg-black/10 mt-2 mx-2 rounded-b">
                        {hint.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h2 className="text-lg font-mono text-white mb-4 uppercase tracking-widest flex items-center gap-2 mt-10">
              {areWriteupsVisible ? <Unlock className="w-5 h-5 text-cyber-neon" /> : <Lock className="w-5 h-5 text-cyber-danger" />}
              Даалгаврын бодолт (Writeup)
            </h2>
            
            {areWriteupsVisible ? (
              <div className="text-cyber-text bg-[#0a0a0a] border border-cyber-neon/30 p-6 rounded-lg text-sm overflow-x-auto shadow-[0_0_15px_rgba(57,255,20,0.05)]">
                 <div className="markdown-body font-mono text-xs">
                  <Markdown>{task.writeup}</Markdown>
                 </div>
              </div>
            ) : (
              <div className="p-8 border border-cyber-danger/30 bg-cyber-danger/5 rounded-lg flex flex-col items-center justify-center text-center">
                <Lock className="w-8 h-8 text-cyber-danger mb-3" />
                <h3 className="font-bold text-cyber-danger mb-1">ХААЛТТАЙ</h3>
                <p className="text-sm text-cyber-danger/70 max-w-md">Тэмцээн үргэлжилж байх үед бодолт нууцлагдсан байгаа. Тэмцээн дуусахад нээгдэнэ.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};
