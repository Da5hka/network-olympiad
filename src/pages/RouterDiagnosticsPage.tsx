import React, { useState } from 'react';
import { useAppContext } from '../store/AppContext';
import { Server, Activity, AlertTriangle, ShieldCheck, Search, Filter } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import { RouterDiagnostic } from '../types';

export const RouterDiagnosticsPage: React.FC = () => {
  const { state } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  const filteredDiagnostics = state.diagnostics.filter(d => {
    const matchesSearch = d.ip.includes(searchTerm) || d.routerNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : d.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Healthy': return 'text-cyber-neon border-cyber-neon/30 bg-cyber-neon/5';
      case 'Degraded': return 'text-cyber-warning border-cyber-warning/30 bg-cyber-warning/5';
      case 'Down': return 'text-cyber-danger border-cyber-danger/30 bg-cyber-danger/5';
      default: return 'text-cyber-text-muted border-cyber-border bg-black/20';
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Network Operations Center</h1>
          <p className="text-cyber-text-muted">Live telemetry and validation matrix from participant routers</p>
        </div>
        <div className="flex gap-4">
           <div className="relative w-full lg:w-64">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-cyber-text-muted" />
            </div>
            <input
              type="text"
              className="block w-full pl-9 pr-3 py-2 border border-cyber-border rounded-md text-sm bg-cyber-card text-cyber-text placeholder-cyber-text-muted focus:outline-none focus:ring-1 focus:ring-cyber-accent"
              placeholder="Filter by IP or R-ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
             <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-4 w-4 text-cyber-text-muted" />
            </div>
            <select
              className="appearance-none block w-full pl-9 pr-8 py-2 border border-cyber-border rounded-md text-sm bg-cyber-card text-cyber-text focus:outline-none focus:ring-1 focus:ring-cyber-accent"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Status</option>
              <option value="Healthy">Healthy</option>
              <option value="Degraded">Degraded</option>
              <option value="Down">Down</option>
            </select>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center gap-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck className="w-16 h-16 text-cyber-neon" /></div>
          <p className="text-[10px] text-cyber-neon uppercase font-bold tracking-widest z-10">Healthy Nodes</p>
          <p className="text-3xl font-mono font-bold text-white z-10">{state.diagnostics.filter(d => d.status === 'Healthy').length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl flex flex-col justify-center gap-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><Activity className="w-16 h-16 text-cyber-warning" /></div>
          <p className="text-[10px] text-cyber-warning uppercase font-bold tracking-widest z-10">Degraded Nodes</p>
          <p className="text-3xl font-mono font-bold text-white z-10">{state.diagnostics.filter(d => d.status === 'Degraded').length}</p>
        </div>
        <div className="glass-panel p-4 rounded-2xl border-cyber-danger/30 bg-cyber-danger/5 flex flex-col justify-center gap-1 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><AlertTriangle className="w-16 h-16 text-cyber-danger" /></div>
          <p className="text-[10px] text-cyber-danger uppercase font-bold tracking-widest z-10">Down Nodes</p>
          <p className="text-3xl font-mono font-bold text-white z-10">{state.diagnostics.filter(d => d.status === 'Down').length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {filteredDiagnostics.map(diag => (
          <div key={diag.id} className="glass-panel rounded-2xl overflow-hidden hover:border-cyber-accent/30 transition-colors p-1">
            <div className="flex flex-col lg:flex-row bg-black/20 rounded-xl overflow-hidden">
              <div className="w-full lg:w-1/4 p-5 border-r border-transparent flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                       {diag.routerNumber}
                    </h3>
                    <div className="w-2 h-2 rounded-full mt-1" style={{backgroundColor: diag.status === 'Healthy' ? '#34d399' : diag.status === 'Degraded' ? '#f59e0b' : '#ef4444'}}></div>
                  </div>
                  <p className="text-[10px] font-mono text-cyber-accent/80 mb-4">{diag.ip}</p>
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-tighter text-cyber-text-muted mb-1">Last Telemetry Check:</p>
                  <p className="text-[10px] text-white">{formatDate(diag.lastCheck)}</p>
                </div>
              </div>
              
              <div className="w-full lg:w-3/4 p-0 flex flex-col">
                <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y divide-cyber-border/50 border-b border-cyber-border/50">
                  <div className="p-3 text-center">
                    <p className="text-[10px] uppercase font-mono text-cyber-text-muted mb-1">ICMP</p>
                    <p className={cn("text-sm font-bold", diag.servicesReachable['ICMP'] ? "text-cyber-neon" : "text-cyber-danger")}>
                      {diag.servicesReachable['ICMP'] ? 'UP' : 'DOWN'}
                    </p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] uppercase font-mono text-cyber-text-muted mb-1">SSH</p>
                    <p className={cn("text-sm font-bold", diag.servicesReachable['SSH'] ? "text-cyber-neon" : "text-cyber-danger")}>
                      {diag.servicesReachable['SSH'] ? 'UP' : 'DOWN'}
                    </p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] uppercase font-mono text-cyber-text-muted mb-1">OSPF</p>
                    <p className={cn("text-sm font-bold", diag.protocolsStatus['OSPF'] === 'Up' ? "text-cyber-neon" : "text-cyber-danger")}>
                      {diag.protocolsStatus['OSPF'] || 'UNK'}
                    </p>
                  </div>
                  <div className="p-3 text-center">
                    <p className="text-[10px] uppercase font-mono text-cyber-text-muted mb-1">BGP</p>
                    <p className={cn("text-sm font-bold", diag.protocolsStatus['BGP'] === 'Up' ? "text-cyber-neon" : "text-cyber-danger")}>
                      {diag.protocolsStatus['BGP'] || 'UNK'}
                    </p>
                  </div>
                </div>
                
                <div className="flex-1 min-h-[100px] p-4 bg-[#0a0a0a] font-mono text-xs overflow-y-auto">
                  <div className="space-y-1">
                    <p className="text-cyber-text-muted opacity-50 mb-2">--- Diagnostic Events ---</p>
                    {diag.logs.map(log => (
                       <div key={log.id} className="flex gap-2">
                        <span className="text-cyber-text-muted flex-shrink-0">[{log.timestamp.split('T')[1].split('Z')[0]}]</span>
                        <span className={cn(
                          log.level === 'SUCCESS' ? 'text-cyber-neon' :
                          log.level === 'ERROR' ? 'text-cyber-danger' :
                          log.level === 'WARN' ? 'text-cyber-warning' : 'text-blue-400'
                        )}>{log.message}</span>
                      </div>
                    ))}
                    {!diag.logs.length && <p className="text-cyber-text-muted">No events recorded.</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredDiagnostics.length === 0 && (
         <div className="text-center py-12 glass-panel rounded-xl">
          <Activity className="w-12 h-12 text-cyber-border mx-auto mb-4" />
          <p className="text-cyber-text-muted">No telemetry data matches the filters.</p>
        </div>
      )}
    </div>
  );
};
