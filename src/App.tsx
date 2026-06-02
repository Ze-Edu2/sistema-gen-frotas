/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, Shield, User as UserIcon, LogOut, LayoutDashboard, Users, Clock, 
  DollarSign, Database, Menu, X, ShieldCheck, HardHat, FileBadge 
} from 'lucide-react';
import { LoggedUser } from './types';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import DriversModule from './components/DriversModule';
import FleetModule from './components/FleetModule';
import WorkLogsModule from './components/WorkLogsModule';
import PaymentsModule from './components/PaymentsModule';
import SupabaseHelper from './components/SupabaseHelper';
import { isSupabaseConfigured } from './supabaseClient';

export default function App() {
  const [session, setSession] = useState<LoggedUser | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Carregar sessão persistente local para conveniência
  useEffect(() => {
    const saved = localStorage.getItem('transroute_session');
    if (saved) {
      try {
        setSession(JSON.parse(saved));
      } catch (e) {
        localStorage.removeItem('transroute_session');
      }
    }
  }, []);

  const handleLoginSuccess = (user: LoggedUser) => {
    setSession(user);
    localStorage.setItem('transroute_session', JSON.stringify(user));
    setActiveTab('dashboard'); // Volta ao dashboard no login
  };

  const handleLogout = () => {
    localStorage.removeItem('transroute_session');
    setSession(null);
  };

  const navigateTo = (tabName: string) => {
    setActiveTab(tabName);
    setMobileMenuOpen(false);
  };

  // Se não estiver autenticado, mostra tela de Login e Senha
  if (!session) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Abas disponíveis com base no perfil logado (ADM ou Motorista)
  const tabs = session.role === 'admin' 
    ? [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'drivers', label: 'Motoristas', icon: Users },
        { id: 'fleet', label: 'Frota de Caminhões', icon: Truck },
        { id: 'logs', label: 'Jornadas (Ponto)', icon: Clock },
        { id: 'payments', label: 'Controle Pagamentos', icon: DollarSign },
        { id: 'supabase', label: 'Banco Supabase', icon: Database }
      ]
    : [
        { id: 'dashboard', label: 'Meu Painel', icon: LayoutDashboard },
        { id: 'logs', label: 'Bater Ponto / Viagens', icon: Clock },
        { id: 'supabase', label: 'Conexão Banco', icon: Database }
      ];

  const CurrentComponent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={navigateTo} 
            isAdmin={session.role === 'admin'} 
            driverId={session.driverId} 
          />
        );
      case 'drivers':
        return session.role === 'admin' ? <DriversModule /> : <Dashboard onNavigate={navigateTo} isAdmin={false} driverId={session.driverId} />;
      case 'fleet':
        return session.role === 'admin' ? <FleetModule /> : <Dashboard onNavigate={navigateTo} isAdmin={false} driverId={session.driverId} />;
      case 'logs':
        return <WorkLogsModule user={session} />;
      case 'payments':
        return session.role === 'admin' ? <PaymentsModule /> : <Dashboard onNavigate={navigateTo} isAdmin={false} driverId={session.driverId} />;
      case 'supabase':
        return <SupabaseHelper />;
      default:
        return <Dashboard onNavigate={navigateTo} isAdmin={session.role === 'admin'} driverId={session.driverId} />;
    }
  };

  return (
    <div className="flex bg-slate-950 min-h-screen font-sans text-slate-200" id="main-app-container">
      
      {/* 1. SIDEBAR (DESKTOP) */}
      <aside className="hidden lg:flex flex-col w-56 bg-slate-900/50 border-r border-slate-800 p-4 gap-2 shrink-0" id="desktop-sidebar">
        
        {/* Branding */}
        <div className="flex items-center gap-3 pb-6 border-b border-slate-800 mb-6" id="desktop-sidebar-brand">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20" id="brand-ico">
            TR
          </div>
          <div className="flex flex-col">
            <h1 className="text-sm font-bold tracking-tight text-white uppercase">TransRoute</h1>
            <p className="text-[10px] text-indigo-400 font-mono font-medium">FROTADO ENGINE</p>
          </div>
        </div>

        {/* User Card */}
        <div className="mb-4 p-3 bg-slate-900/40 rounded-2xl border border-slate-800 flex items-center gap-3" id="desktop-user-card">
          <div className="p-2 bg-indigo-950/40 text-indigo-400 rounded-xl border border-indigo-500/20">
            {session.role === 'admin' ? <Shield className="h-4 w-4" /> : <HardHat className="h-4 w-4" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{session.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase ${
                session.role === 'admin' ? 'bg-indigo-950/40 text-indigo-400 border border-indigo-500/20' : 'bg-amber-900/40 text-amber-400 border border-amber-500/20'
              }`}>
                {session.role === 'admin' ? 'ADM' : 'Motorista'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Sidebar List */}
        <nav className="flex-1 space-y-1" id="desktop-sidebar-nav">
          {tabs.map(tab => {
            const Icon = tab.icon;
            const isSelected = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`sidemenu-${tab.id}`}
                onClick={() => navigateTo(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-500/10 text-indigo-400 font-semibold border border-indigo-500/20' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-850'
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* System Info Card */}
        <div className="mb-4 mt-auto p-3.5 bg-slate-900/40 rounded-2xl border border-slate-800 text-slate-400 leading-normal" id="sidebar-sync-card">
          <p className="text-[10px]">
            Sistema sincronizado com tabelas de {session.role === 'admin' ? '`drivers`, `vehicles` e `payments`' : '`work_logs` e `drivers`'} no Supabase Postgres.
          </p>
        </div>

        {/* Logout Bottom */}
        <div className="pt-4 border-t border-slate-800" id="desktop-sidebar-logout">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-red-450 hover:bg-red-950/20 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* 2. MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0" id="content-pane">
        
        {/* HEADER */}
        <header className="bg-slate-900 border-b border-slate-800 h-16 flex items-center justify-between px-6 shrink-0 z-10" id="master-header">
          
          {/* Mobile Menu Button / Title fallback */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 lg:hidden cursor-pointer"
              title="Menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            
            {/* Logo on Mobile */}
            <div className="flex items-center gap-2 lg:hidden">
              <Truck className="h-5 w-5 text-indigo-400" />
              <span className="font-bold text-white tracking-tight text-sm">TransRoute</span>
            </div>

            {/* Breadcrumb Info on Desktop */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-450">
              <span className="font-mono text-[10px] tracking-wider uppercase">Sistemas</span>
              <span>/</span>
              <span className="text-slate-300 capitalize font-medium">{activeTab === 'logs' ? 'Jornadas de Trabalho' : activeTab}</span>
            </div>
          </div>

          {/* Right Header Controls (Conn Indicator + Profile) */}
          <div className="flex items-center gap-4">
            
            {/* Supabase Connectivity status indicator widget */}
            <div className="flex items-center">
              {isSupabaseConfigured ? (
                <div 
                  className="px-3 py-1.5 bg-slate-800/80 rounded-full border border-slate-750 flex items-center gap-2 text-white text-[10px] font-medium uppercase tracking-wider"
                  title="Conexão direta ativa do Supabase configurada na porta do Cloud Run."
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
                  <span className="hidden sm:inline">Supabase Ativo</span>
                  <span className="sm:hidden text-[9px]">Ativo</span>
                </div>
              ) : (
                <div 
                  className="px-3 py-1.5 bg-slate-850/80 rounded-full border border-slate-750 flex items-center gap-2 cursor-pointer text-white text-[10px] font-medium uppercase tracking-wider"
                  onClick={() => navigateTo('supabase')}
                  title="Clique para ver instruções de conexão com Supabase."
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]"></div>
                  <span className="hidden sm:inline">Modo Local (Cache)</span>
                  <span className="sm:hidden text-[9px]">Local</span>
                </div>
              )}
            </div>

            {/* Simple Welcome and Profile */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-800" id="header-user-badge">
              <div className="hidden md:block text-right">
                <span className="block text-xs font-semibold text-white leading-none">{session.name}</span>
                <span className="text-[10px] text-slate-500 font-medium">@{session.username}</span>
              </div>
              <div className="w-9 h-9 rounded-full border-2 border-slate-800 bg-slate-900 flex items-center justify-center text-xs font-bold text-indigo-400 uppercase">
                {session.name.substring(0, 2)}
              </div>
              <div className="p-1.5 bg-slate-900 border border-slate-850 rounded-lg lg:hidden">
                <button
                  onClick={handleLogout}
                  title="Sair"
                  className="text-slate-400 hover:text-red-400 shrink-0 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>

          </div>
        </header>

        {/* MOBILE SIDEBAR/DRAWER */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-30 lg:hidden flex bg-slate-950/80 backdrop-blur-xs" id="mobile-drawer-portal">
            <div className="w-64 bg-slate-900 h-full p-5 flex flex-col justify-between border-r border-slate-800 shadow-2xl relative">
              <button 
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
              
              <div>
                <div className="flex items-center gap-2 pb-6 border-b border-slate-800 mb-6">
                  <Truck className="h-5.5 w-5.5 text-indigo-450" />
                  <span className="font-bold text-white text-base">TransRoute</span>
                </div>

                <div className="mb-6 p-2 bg-slate-950/60 rounded-xl flex items-center gap-3 border border-slate-850">
                  <span className="w-8 h-8 rounded-full bg-indigo-950 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase border border-indigo-500/10">
                    {session.name.substring(0, 2)}
                  </span>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate leading-none mb-1">{session.name}</p>
                    <span className="px-1 py-0.2 rounded text-[7px] font-bold bg-indigo-900/40 text-indigo-400 uppercase border border-indigo-500/10">
                      {session.role === 'admin' ? 'ADM' : 'Motorista'}
                    </span>
                  </div>
                </div>

                <nav className="space-y-1">
                  {tabs.map(tab => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => navigateTo(tab.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                          activeTab === tab.id 
                            ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' 
                            : 'text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-red-400 cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Sair do Sistema</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SCROLLABLE HERO WORKSPACE */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6" id="workspace-scroller">
          <div className="max-w-7xl mx-auto" id="app-workspace-content">
            <CurrentComponent />
          </div>
        </main>

        {/* Bottom Status Footer (Bento Grid Style) */}
        <footer className="h-8 bg-indigo-600 px-6 flex items-center justify-between text-[10px] font-mono text-white/90 shrink-0 select-none" id="bento-status-footer">
          <div className="truncate">SYSTEM_INTEGRATION_SYNC: {isSupabaseConfigured ? 'POSTGRESQL_SUPABASE_CONNECTED ✔' : 'BROWSER_LOCALSTORAGE_CACHE ⚠'}</div>
          <div className="hidden md:flex gap-4">
            <span>ENGINE_LATENCY: 12ms</span>
            <span>SECURE_INGRESS: PORT_3000</span>
            <span>IDENTIFIER_SESSÃO: {session.role.toUpperCase()}</span>
          </div>
        </footer>

      </div>

    </div>
  );
}
