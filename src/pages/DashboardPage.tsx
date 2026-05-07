import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Trophy, Target, Users, Medal, Zap } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';

export const DashboardPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();

  const [viewCategory, setViewCategory] = useState<'Student' | 'Engineer'>('Student');

  const filteredParticipants = state.participants.filter(p => p.category === viewCategory);
  const sortedParticipants = [...filteredParticipants].sort((a, b) => b.totalScore - a.totalScore);
  const top3 = sortedParticipants.slice(0, 3);
  
  const totalSubmissions = filteredParticipants.reduce((acc, p) => acc + p.taskScores.length, 0);

  return (
    <div className="space-y-8 pb-10">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Шууд оноон самбар</h1>
          <p className="text-cyber-text-muted">Сүлжээний олимпиадын бодит цагийн мэдээлэл</p>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex bg-black/40 p-1 rounded-lg w-fit border border-cyber-border">
        <button
          className={cn("px-8 py-2 rounded-md font-mono text-sm uppercase tracking-wider transition-all", viewCategory === 'Student' ? "bg-cyber-card text-cyber-accent shadow shadow-cyber-accent/20" : "text-cyber-text-muted hover:text-white")}
          onClick={() => setViewCategory('Student')}
        >
          Оюутан
        </button>
        <button
          className={cn("px-8 py-2 rounded-md font-mono text-sm uppercase tracking-wider transition-all", viewCategory === 'Engineer' ? "bg-cyber-card text-cyber-accent shadow shadow-cyber-accent/20" : "text-cyber-text-muted hover:text-white")}
          onClick={() => setViewCategory('Engineer')}
        >
          Инженер
        </button>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Participants', value: state.participants.length, icon: Users, color: 'text-cyber-accent' },
          { label: 'Available Tasks', value: state.tasks.filter(t => t.isAvailable).length, icon: Target, color: 'text-cyber-warning' },
          { label: 'Validations', value: totalSubmissions, icon: Zap, color: 'text-cyber-neon' },
          { label: 'Current Leader', value: top3[0]?.name || '---', icon: Trophy, color: 'text-cyber-danger', valueClass: 'text-base font-bold line-clamp-2 leading-tight' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="glass-panel p-5 rounded-xl flex items-center justify-between"
          >
            <div>
              <p className="text-xs text-cyber-text-muted font-mono uppercase tracking-wider mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold text-white ${stat.valueClass || ''}`}>{stat.value}</p>
            </div>
            <div className={`p-3 rounded-lg bg-white/5 ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Podium */}
      <div className="py-8">
        <h2 className="text-lg font-mono text-cyber-text-muted uppercase tracking-widest mb-6 flex items-center gap-2">
          <Medal className="w-5 h-5 text-cyber-warning" /> Top Operators
        </h2>
        <div className="grid grid-cols-3 gap-6 items-end h-[250px] relative">
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyber-border to-transparent" />
          
          {/* 2nd Place */}
          {top3[1] && (
            <motion.div initial={{ height: 0 }} animate={{ height: '70%' }} className="relative bg-gradient-to-t from-cyber-card to-transparent border border-b-0 border-cyber-border rounded-t-lg mx-4 flex flex-col items-center p-4">
              <div className="absolute -top-12 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-cyber-bg border-2 border-[#C0C0C0] shadow-[0_0_15px_rgba(192,192,192,0.5)] flex items-center justify-center mb-2 z-10">
                  <span className="text-2xl font-bold text-[#C0C0C0]">2</span>
                </div>
                <div className="text-center w-full min-w-[120px] px-1">
                  <p className="font-bold text-sm text-white break-words cursor-pointer hover:text-cyber-accent leading-tight" onClick={() => navigate(`/participants/${top3[1].id}`)}>{top3[1].name}</p>
                  <p className="text-sm font-mono text-[#C0C0C0] mt-1">{top3[1].totalScore} pts</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 1st Place */}
          {top3[0] && (
            <motion.div initial={{ height: 0 }} animate={{ height: '90%' }} className="relative bg-gradient-to-t from-cyber-card to-cyber-warning/10 border border-b-0 border-cyber-warning/50 rounded-t-lg mx-2 flex flex-col items-center p-4 shadow-[0_0_30px_rgba(255,184,0,0.1)]">
              <div className="absolute -top-16 flex flex-col items-center">
                <Trophy className="w-8 h-8 text-cyber-warning mb-2 animate-pulse" />
                <div className="w-20 h-20 rounded-full bg-cyber-bg border-4 border-cyber-warning shadow-[0_0_20px_rgba(255,184,0,0.6)] flex items-center justify-center mb-2 z-10">
                  <span className="text-4xl font-bold text-cyber-warning">1</span>
                </div>
                <div className="text-center w-full min-w-[140px] px-1">
                  <p className="font-bold text-base text-white break-words cursor-pointer hover:text-cyber-accent leading-tight" onClick={() => navigate(`/participants/${top3[0].id}`)}>{top3[0].name}</p>
                  <p className="text-base font-mono text-cyber-warning mt-1">{top3[0].totalScore} pts</p>
                </div>
              </div>
            </motion.div>
          )}

          {/* 3rd Place */}
          {top3[2] && (
            <motion.div initial={{ height: 0 }} animate={{ height: '60%' }} className="relative bg-gradient-to-t from-cyber-card to-transparent border border-b-0 border-cyber-border rounded-t-lg mx-4 flex flex-col items-center p-4">
              <div className="absolute -top-12 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-cyber-bg border-2 border-[#CD7F32] shadow-[0_0_15px_rgba(205,127,50,0.5)] flex items-center justify-center mb-2 z-10">
                  <span className="text-2xl font-bold text-[#CD7F32]">3</span>
                </div>
                <div className="text-center w-full min-w-[120px] px-1">
                  <p className="font-bold text-sm text-white break-words cursor-pointer hover:text-cyber-accent leading-tight" onClick={() => navigate(`/participants/${top3[2].id}`)}>{top3[2].name}</p>
                  <p className="text-sm font-mono text-[#CD7F32] mt-1">{top3[2].totalScore} pts</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-panel rounded-2xl overflow-hidden mt-8">
        <div className="p-5 border-b border-cyber-border bg-cyber-card flex justify-between items-center">
          <h2 className="text-xs font-bold text-cyber-text-muted uppercase tracking-wider">Leaderboard</h2>
        </div>
        <div className="overflow-x-auto p-4 space-y-2">
           {sortedParticipants.map((p, index) => (
            <div 
              key={p.id} 
              onClick={() => navigate(`/participants/${p.id}`)}
              className={cn(
                "flex items-center gap-4 p-4 rounded-xl border transition-colors cursor-pointer group",
                index === 0 ? "bg-cyber-accent/10 border-cyber-accent/30" : "hover:bg-white/5 border-transparent hover:border-cyber-border"
              )}
            >
              <span className={cn(
                "font-black text-sm w-6 text-center",
                index === 0 ? "text-cyber-accent" : "text-cyber-text-muted"
              )}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate text-white">{p.name}</p>
                <p className="text-[10px] text-cyber-text-muted truncate">{p.organization}</p>
              </div>
              <div className="flex items-center gap-6">
                 <div className="text-center hidden md:block">
                  <p className="text-[10px] uppercase font-mono text-cyber-text-muted">Tasks</p>
                  <p className="font-mono text-sm text-cyber-text">{p.taskScores.length}</p>
                </div>
                 <div className="text-right">
                  <p className={cn("text-sm font-mono font-bold", index === 0 ? "text-cyber-accent" : "text-cyber-text")}>{p.totalScore}</p>
                  <p className="text-[8px] text-cyber-text-muted uppercase">Points</p>
                </div>
              </div>
            </div>
           ))}
        </div>
      </div>
    </div>
  );
};
