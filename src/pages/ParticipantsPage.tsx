import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Search, Server, Shield, Activity, WifiOff, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { cn } from '../lib/utils';
import { ParticipantStatus } from '../types';

export const ParticipantsPage: React.FC = () => {
  const { state } = useAppContext();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [viewCategory, setViewCategory] = useState<'Student' | 'Engineer'>('Student');

  const filteredParticipants = state.participants.filter(p => 
    p.category === viewCategory &&
    (p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    p.organization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.routerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const exportToExcel = () => {
    const exportData = filteredParticipants.map(p => ({
      'Дугаар': p.routerNumber,
      'Нэр': p.name,
      'Байгууллага': p.organization,
      'Төрөл': p.category === 'Student' ? 'Оюутан' : 'Инженер',
      'Оноо': p.totalScore,
      'IP Хаяг': p.routerIp,
      'Төлөв': p.status
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Оролцогчид");
    XLSX.writeFile(wb, "Оролцогчдын_жагсаалт.xlsx");
  };

  const getStatusIcon = (status: ParticipantStatus) => {
    switch(status) {
      case 'Online': return <Activity className="w-4 h-4 text-cyber-neon" />;
      case 'Offline': return <WifiOff className="w-4 h-4 text-cyber-text-muted" />;
      case 'Connecting': return <Activity className="w-4 h-4 text-cyber-warning animate-pulse" />;
      case 'Issues': return <Shield className="w-4 h-4 text-cyber-danger" />;
    }
  };

  const getStatusColor = (status: ParticipantStatus) => {
    switch(status) {
      case 'Online': return 'text-cyber-neon bg-cyber-neon/10 border-cyber-neon/20';
      case 'Offline': return 'text-cyber-text-muted bg-gray-500/10 border-gray-500/20';
      case 'Connecting': return 'text-cyber-warning bg-cyber-warning/10 border-cyber-warning/20';
      case 'Issues': return 'text-cyber-danger bg-cyber-danger/10 border-cyber-danger/20';
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Оролцогчдын бүртгэл</h1>
          <p className="text-cyber-text-muted">Оролцогчдын жагсаалт болон төлөвийг хянах</p>
        </div>
        <div className="relative w-full md:w-72">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-cyber-text-muted" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-cyber-border rounded-md leading-5 bg-cyber-card text-cyber-text placeholder-cyber-text-muted focus:outline-none focus:ring-1 focus:ring-cyber-accent focus:border-cyber-accent sm:text-sm"
            placeholder="Оролцогч, IP, байгууллагаар хайх..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </header>

      {/* Category Tabs and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 w-full">
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
        
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-cyber-accent/10 border border-cyber-accent/30 text-cyber-accent rounded-md hover:bg-cyber-accent hover:text-black transition-colors font-mono text-sm"
        >
          <Download className="w-4 h-4" />
          Excel-р татах
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredParticipants.map(p => (
          <div 
            key={p.id} 
            className="glass-panel rounded-2xl p-4 hover:bg-white/10 hover:border-cyber-accent/50 transition-all cursor-pointer group flex flex-col"
            onClick={() => navigate(`/participants/${p.id}`)}
          >
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-sm font-bold text-white truncate">{p.name}</h3>
                <p className="text-xs text-cyber-text-muted truncate">{p.organization}</p>
              </div>
              <div className="w-2 h-2 rounded-full shrink-0" style={{backgroundColor: p.status === 'Online' ? '#34d399' : p.status === 'Issues' ? '#ef4444' : p.status === 'Connecting' ? '#f59e0b' : '#94a3b8'}}></div>
            </div>
            
            <div className="mt-auto space-y-3 border-t border-white/5 pt-3">
              <div className="flex justify-between items-center group-hover:bg-white/5 p-2 rounded-lg transition-colors">
                <span className="text-xs font-mono text-cyber-text-muted uppercase">Дугаар: {p.routerNumber}</span>
                <span className="text-xs font-mono text-cyber-accent/80">{p.routerIp}</span>
              </div>
              
              <div className="flex justify-between items-center group-hover:bg-white/5 p-2 rounded-lg transition-colors">
                <div className="flex items-center gap-4">
                  <span className="text-xs uppercase tracking-tighter text-cyber-text-muted">Даалгавар</span>
                  <div className="flex gap-0.5">
                    {Array.from({length: Math.min(5, p.taskScores.length)}).map((_, i) => (
                      <div key={i} className="w-2 h-2 bg-cyber-neon rounded-[1px]"></div>
                    ))}
                    {p.taskScores.length > 5 && <span className="text-[8px] text-cyber-neon ml-1">+{p.taskScores.length - 5}</span>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-mono font-bold text-white">{p.totalScore}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredParticipants.length === 0 && (
        <div className="text-center py-12 glass-panel rounded-xl">
          <Server className="w-12 h-12 text-cyber-border mx-auto mb-4" />
          <p className="text-cyber-text-muted">Хайлтын шалгуурт тохирох оролцогч олдсонгүй.</p>
        </div>
      )}
    </div>
  );
};
