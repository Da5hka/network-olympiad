import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Activity, LayoutDashboard, Users, CheckSquare, ShieldAlert, Cpu } from 'lucide-react';
import { useAppContext } from '../store/AppContext';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

const navItems = [
  { to: '/', label: 'Хяналтын самбар', icon: LayoutDashboard },
  { to: '/participants', label: 'Оролцогчид', icon: Users },
  { to: '/tasks', label: 'Даалгаврууд', icon: CheckSquare },
  { to: '/admin', label: 'Удирдлагын төв', icon: ShieldAlert },
];

export const NavigationLayout: React.FC = () => {
  const { state } = useAppContext();

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-bg text-cyber-text relative">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-black/40 backdrop-blur-md border-r border-cyber-border flex flex-col z-20">
        <div className="p-6 flex items-center gap-4">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-white font-bold shrink-0">
            N
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-white leading-tight uppercase">NetOlympics <span className="text-cyber-accent font-normal">2026</span></span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive 
                    ? 'bg-cyber-accent/10 border border-cyber-accent/30 text-white shadow-sm' 
                    : 'text-cyber-text-muted hover:text-white hover:bg-white/5 border border-transparent'
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-cyber-border">
          <div className="p-4 rounded-lg bg-cyber-card border border-cyber-border/50 flex flex-col gap-2">
            <h4 className="text-xs font-mono text-cyber-text-muted uppercase tracking-wider">Тэмцээний төлөв</h4>
            <div className="flex items-center gap-2">
              <div className={cn('w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]', {
                'bg-cyber-warning text-cyber-warning': state.competitionState === 'NOT_STARTED',
                'bg-cyber-neon text-cyber-neon animate-pulse': state.competitionState === 'RUNNING',
                'bg-cyber-danger text-cyber-danger': state.competitionState === 'FINISHED',
              })} />
              <span className="text-sm font-medium">
                {state.competitionState === 'NOT_STARTED' && 'ЭХЛЭЭГҮЙ'}
                {state.competitionState === 'RUNNING' && 'ЯВАГДАЖ БАЙНА'}
                {state.competitionState === 'FINISHED' && 'ДУУССАН'}
              </span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-x-hidden overflow-y-auto relative bg-[#02040a]">
        {/* Atmospheric Background Glows */}
        <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none z-0"></div>
        <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-cyan-900/10 blur-[120px] rounded-full pointer-events-none z-0"></div>

        <div className="p-8 max-w-7xl mx-auto h-full relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
