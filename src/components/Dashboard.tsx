/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  BarChart, Users, Truck, Clock, DollarSign, ListCollapse, 
  MapPin, AlertTriangle, CheckSquare, Plus, RefreshCw, Star, ArrowUpRight
} from 'lucide-react';
import { fleetStorage } from '../storage';
import { Driver, Vehicle, WorkLog, Payment } from '../types';

interface DashboardProps {
  onNavigate: (module: string) => void;
  isAdmin: boolean;
  driverId: string | null;
}

export default function Dashboard({ onNavigate, isAdmin, driverId }: DashboardProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const ds = await fleetStorage.getDrivers();
      const vs = await fleetStorage.getVehicles();
      const wls = await fleetStorage.getWorkLogs();
      const ps = await fleetStorage.getPayments();

      setDrivers(ds);
      setVehicles(vs);
      setWorkLogs(wls);
      setPayments(ps);
    } catch (e) {
      console.error("Erro ao carregar dados do dashboard", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter if the logged in user is a Driver (they only see their own metrics)
  const displayDrivers = isAdmin ? drivers : drivers.filter(d => d.id === driverId);
  const displayWorkLogs = isAdmin ? workLogs : workLogs.filter(wl => wl.driverId === driverId);
  const displayPayments = isAdmin ? payments : payments.filter(p => p.driverId === driverId);

  // --- CALCULATING METRICS ---
  const totalDriversCount = displayDrivers.length;
  const activeDriversCount = displayDrivers.filter(d => d.status === 'em_viagem').length;
  const availableDriversCount = displayDrivers.filter(d => d.status === 'disponivel').length;

  const totalVehiclesCount = vehicles.length;
  const activeVehiclesCount = vehicles.filter(v => v.status === 'ativo').length;
  const maintenanceVehiclesCount = vehicles.filter(v => v.status === 'manutencao').length;

  // Hours control
  const totalHoursWorked = displayWorkLogs
    .filter(wl => wl.status === 'aprovado' || wl.status === 'pago')
    .reduce((acc, wl) => acc + wl.totalHours, 0);

  const pendingHours = displayWorkLogs
    .filter(wl => wl.status === 'pendente_aprovacao')
    .reduce((acc, wl) => acc + wl.totalHours, 0);

  // Financial
  const totalEarningsOrPayouts = displayWorkLogs
    .filter(wl => wl.status === 'aprovado' || wl.status === 'pago')
    .reduce((acc, wl) => acc + wl.totalEarnings, 0);

  const pendingPayouts = displayWorkLogs
    .filter(wl => wl.status === 'pendente_aprovacao')
    .reduce((acc, wl) => acc + (wl.totalHours * wl.hourlyRateApplied), 0);

  const totalPaidAmount = displayPayments.reduce((acc, p) => acc + p.amountPaid, 0);

  // --- DYNAMIC DATA FOR CHARTS (ONLY IF DATA EXISTS) ---
  // Driver hours ranked
  const driverHoursChartData = displayDrivers.map(d => {
    const hours = workLogs
      .filter(wl => wl.driverId === d.id && (wl.status === 'aprovado' || wl.status === 'pago'))
      .reduce((acc, wl) => acc + wl.totalHours, 0);
    return { name: d.name, hours };
  }).filter(item => item.hours > 0).sort((a,b) => b.hours - a.hours).slice(0, 5);

  // Vehicle hours ranked
  const vehicleHoursChartData = vehicles.map(v => {
    const hours = workLogs
      .filter(wl => wl.vehicleId === v.id && (wl.status === 'aprovado' || wl.status === 'pago'))
      .reduce((acc, wl) => acc + wl.totalHours, 0);
    return { label: `${v.brand} ${v.model} (${v.plate})`, hours };
  }).filter(item => item.hours > 0).sort((a,b) => b.hours - a.hours).slice(0, 5);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 min-h-[400px]" id="dashboard-loading">
        <RefreshCw className="h-8 w-8 text-blue-500 animate-spin mb-3" />
        <p className="text-slate-400 text-sm">Carregando relatórios...</p>
      </div>
    );
  }

  const isDataEmpty = displayDrivers.length === 0 && vehicles.length === 0 && displayWorkLogs.length === 0;

  return (
    <div className="space-y-6" id="dashboard-wrapper">
      
      {/* Top Welcome Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4" id="dashboard-header">
        <div>
          <h2 className="text-xl font-bold font-sans text-white uppercase tracking-tight">
            {isAdmin ? 'Painel de Controle Central' : 'Painel do Motorista'}
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {isAdmin 
              ? 'Métricas consolidadas de motoristas, veículos cadastrados e controle de faturamento.' 
              : 'Informações sobre suas jornadas registradas, horas acumuladas e estimativas financeiras.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            title="Atualizar dados"
            className="p-2 transition-all text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-xl border border-slate-800 flex items-center justify-center cursor-pointer shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          {isAdmin && (
            <button
              onClick={() => onNavigate('drivers')}
              className="px-4 py-2 transition-all text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl flex items-center gap-1.5 shadow-lg shadow-indigo-550/15 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              <span>Cadastrar Motorista</span>
            </button>
          )}
        </div>
      </div>

      {/* EMPTY STATE - WHEN USER HASN'T ENTERED DATA */}
      {isDataEmpty ? (
        <div className="bg-slate-900 border border-dashed border-slate-850 rounded-3xl p-10 text-center flex flex-col items-center justify-center space-y-4 max-w-2xl mx-auto my-8 shadow-xl" id="dashboard-empty-state">
          <div className="p-4 bg-indigo-550/10 text-indigo-400 rounded-2xl border border-indigo-500/10">
            <BarChart className="h-10 w-10" />
          </div>
          <h3 className="text-base font-bold text-white font-sans mt-2 uppercase tracking-tight">Nenhum dado cadastrado para emitir relatórios</h3>
          <p className="text-slate-400 text-xs max-w-md leading-relaxed">
            De acordo com suas diretrizes, nenhum dado fictício modelo foi pré-gerado. Acesse os módulos abaixo para cadastrar caminhões, caminhoneiros e controle suas jornadas de trabalho!
          </p>
          <div className="flex flex-wrap gap-3 justify-center pt-2 w-full max-w-sm">
            {isAdmin ? (
              <>
                <button
                  onClick={() => onNavigate('drivers')}
                  className="flex-1 px-4 py-2 bg-slate-950 hover:bg-slate-850 text-white text-xs font-semibold rounded-xl border border-slate-800 cursor-pointer transition duration-300"
                >
                  Cadastrar Caminhoneiros
                </button>
                <button
                  onClick={() => onNavigate('fleet')}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition duration-300 shadow-md shadow-indigo-600/10"
                >
                  Cadastrar Caminhões (Frota)
                </button>
              </>
            ) : (
              <button
                onClick={() => onNavigate('logs')}
                className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer transition duration-300"
              >
                Registrar Primeira Viagem
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* METRIC SUMMARIES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="dashboard-metrics-grid">
            
            {/* Drivers Metric */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 hover:border-slate-700/60 transition duration-300 shadow-xl" id="metric-drivers">
              <div className="p-2.5 bg-indigo-500/15 text-indigo-400 rounded-2xl border border-indigo-500/10">
                <Users className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-450 text-[10px] font-mono font-semibold uppercase tracking-wider">
                  {isAdmin ? 'Motoristas' : 'Meu Perfil'}
                </p>
                <h4 className="text-2xl font-bold text-white font-sans mt-0.5 truncate tracking-tight">
                  {totalDriversCount}
                </h4>
                <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-500 truncate">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {availableDriversCount} Disp.
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                    {activeDriversCount} Em viagem
                  </span>
                </div>
              </div>
            </div>

            {/* Vehicles Metric */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 hover:border-slate-700/60 transition duration-300 shadow-xl" id="metric-vehicles">
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/10">
                <Truck className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-450 text-[10px] font-mono font-semibold uppercase tracking-wider">Caminhões</p>
                <h4 className="text-2xl font-bold text-white font-sans mt-0.5 truncate tracking-tight">
                  {totalVehiclesCount}
                </h4>
                <div className="flex items-center gap-2.5 mt-1 text-[10px] text-slate-500 truncate">
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    {activeVehiclesCount} Ativos
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                    {maintenanceVehiclesCount} Em Manut.
                  </span>
                </div>
              </div>
            </div>

            {/* Hours Worked Metric */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 hover:border-slate-700/60 transition duration-300 shadow-xl" id="metric-hours text">
              <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/10">
                <Clock className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-455 text-[10px] font-mono font-semibold uppercase tracking-wider">Horas de Viagem</p>
                <div className="flex items-baseline gap-1" id="hours-display">
                  <h4 className="text-2xl font-bold text-white font-sans mt-0.5 truncate tracking-tight">
                    {totalHoursWorked.toFixed(1)}h
                  </h4>
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[10px] text-amber-500 truncate font-mono">
                  {pendingHours > 0 ? (
                    <span>• {pendingHours.toFixed(1)}h aguardando aprovação</span>
                  ) : (
                    <span className="text-slate-450">Tudo aprovado</span>
                  )}
                </div>
              </div>
            </div>

            {/* Financial Calculations */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-3xl flex items-center gap-4 hover:border-slate-700/60 transition duration-300 shadow-xl" id="metric-earnings">
              <div className="p-2.5 bg-indigo-650/10 text-indigo-400 rounded-2xl border border-indigo-600/15">
                <DollarSign className="h-6 w-6" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-455 text-[10px] font-mono font-semibold uppercase tracking-wider">
                  {isAdmin ? 'Total Faturado' : 'Meus Ganhos'}
                </p>
                <h4 className="text-2xl font-bold text-white font-sans mt-0.5 truncate tracking-tight">
                  R$ {totalEarningsOrPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </h4>
                <div className="flex items-center gap-2 mt-1 text-[10px] truncate">
                  {pendingPayouts > 0 ? (
                    <span className="text-amber-500 font-mono">R$ {pendingPayouts.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendente</span>
                  ) : (
                    <span className="text-emerald-500 font-mono">Pago: R$ {totalPaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  )}
                </div>
              </div>
            </div>

          </div>

          {/* DYNAMIC REPORTS AND CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="dashboard-reports-details">
            
            {/* Visual Chart Panel: Hours worked per Driver */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-8 flex flex-col justify-between hover:border-slate-750 transition duration-300 shadow-2xl" id="chart-driver-load">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                      {isAdmin ? 'Horas Acumuladas por Caminhoneiro (Top 5)' : 'Suas Horas Trabalhadas'}
                    </h3>
                    <p className="text-slate-450 text-[11px] mt-0.5">Relatório visual baseado em horas aprovadas de trabalho e percursos rodados.</p>
                  </div>
                  <BarChart className="h-4.5 w-4.5 text-slate-500" />
                </div>

                {driverHoursChartData.length > 0 ? (
                  <div className="space-y-4" id="bar-chart-visualization">
                    {driverHoursChartData.map((item, index) => {
                      const maxHours = Math.max(...driverHoursChartData.map(d => d.hours), 1);
                      const percentage = (item.hours / maxHours) * 100;
                      return (
                        <div key={item.name} className="space-y-1.5" id={`chart-row-${index}`}>
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-300 font-medium truncate max-w-[200px]">{item.name}</span>
                            <span className="text-slate-400 font-mono font-medium">{item.hours.toFixed(1)} horas</span>
                          </div>
                          <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800/40">
                            <div 
                              className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 rounded-full transition-all duration-550 relative"
                              style={{ width: `${percentage}%` }}
                            >
                              <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:12px_12px] animate-pulse"></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-850 text-slate-500 text-xs" id="chart-nodata">
                    <Clock className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                    <span>Nenhuma hora aprovada ou paga registrada para listar no gráfico ainda.</span>
                  </div>
                )}
              </div>

              {/* Status Section row */}
              <div className="pt-6 border-t border-slate-800 mt-6 grid grid-cols-3 gap-2.5 text-center" id="stat-dials">
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850" id="dial-disp">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Total Viagens</div>
                  <div className="text-lg font-bold text-white mt-1">{displayWorkLogs.length}</div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850" id="dial-pend">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Aguardando ADM</div>
                  <div className="text-lg font-bold text-amber-500 mt-1">
                    {displayWorkLogs.filter(wl => wl.status === 'pendente_aprovacao').length}
                  </div>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-2xl border border-slate-850" id="dial-aprov">
                  <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Viagens Pagas</div>
                  <div className="text-lg font-bold text-emerald-400 mt-1">
                    {displayWorkLogs.filter(wl => wl.status === 'pago').length}
                  </div>
                </div>
              </div>

            </div>

            {/* Quick Fleet Reports Column */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:col-span-4 flex flex-col justify-between hover:border-slate-750 transition duration-300 shadow-2xl" id="report-vehicle-usage">
              <div>
                <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">Uso dos Caminhões</h3>
                    <p className="text-slate-450 text-[11px] mt-0.5 font-medium">Uso acumulado por placa (Horas).</p>
                  </div>
                  <Truck className="h-4.5 w-4.5 text-slate-500" />
                </div>

                {vehicleHoursChartData.length > 0 ? (
                  <div className="space-y-4" id="vehicle-usage-bars">
                    {vehicleHoursChartData.map((item, index) => {
                      const maxVehHours = Math.max(...vehicleHoursChartData.map(v => v.hours), 1);
                      const widthPercent = (item.hours / maxVehHours) * 100;
                      return (
                        <div key={item.label} className="text-xs" id={`veh-row-${index}`}>
                          <div className="flex justify-between mb-1.5">
                            <span className="text-slate-300 font-medium truncate max-w-[150px]">{item.label}</span>
                            <span className="text-slate-400 font-mono">{item.hours.toFixed(1)}h</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850/60">
                            <div 
                              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full" 
                              style={{ width: `${widthPercent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-6 text-center bg-slate-950/40 rounded-2xl border border-slate-850 text-slate-500 text-xs" id="vehicle-nodata">
                    <Truck className="w-8 h-8 mx-auto text-slate-750 mb-2" />
                    <span>Nenhum caminhão acumulou horas de viagem ainda.</span>
                  </div>
                )}
              </div>

              {/* Maintenance summary indicator */}
              <div className="mt-6 pt-5 border-t border-slate-800" id="maintenance-panel">
                <h4 className="text-[10px] font-mono font-semibold text-slate-500 uppercase tracking-widest mb-2.5">Atenção Manutenção</h4>
                {vehicles.filter(v => v.status === 'manutencao').length > 0 ? (
                  <div className="flex items-center gap-2 p-2.5 bg-amber-955/10 border border-amber-800/25 rounded-2xl text-amber-200 text-xs" id="maintenance-alert-box">
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                    <span>Há caminhões parados em manutenção no momento!</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 p-2.5 bg-emerald-955/10 border border-emerald-800/25 rounded-2xl text-emerald-200 text-xs" id="maintenance-ok-box">
                    <CheckSquare className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>Todos os veículos da frota ativos estão disponíveis!</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RECENT TRIPS TABLE / LIST */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 hover:border-slate-750 transition duration-300 shadow-2xl" id="recent-trips-section">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <div>
                <h3 className="text-xs font-semibold text-slate-200 font-mono uppercase tracking-wider">
                  {isAdmin ? 'Registro Geral de Viagens e Jornadas' : 'Suas Jornadas de Trabalho Recentes'}
                </h3>
                <p className="text-slate-450 text-xs mt-0.5">Histórico recente de horas trabalhadas e status de faturamento por hora.</p>
              </div>
              <button 
                onClick={() => onNavigate('logs')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium underline underline-offset-2 flex items-center gap-1 cursor-pointer transition duration-200"
              >
                <span>{isAdmin ? 'Gerenciar Jornadas' : 'Bater Ponto / Histórico completo'}</span>
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>

            {displayWorkLogs.length > 0 ? (
              <div className="overflow-x-auto" id="recent-trips-table-container">
                <table className="w-full text-left border-collapse" id="recent-trips-table">
                  <thead>
                    <tr className="border-b border-slate-800/80 text-slate-455 text-xs font-mono">
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Data</th>
                      {isAdmin && <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Motorista</th>}
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Caminhão</th>
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Duração</th>
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Valor Estimado</th>
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Status</th>
                      <th className="py-2.5 font-semibold px-3 uppercase tracking-wider text-[10px]">Descrição da rota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {displayWorkLogs.slice(-5).reverse().map((wl) => {
                      const motorista = drivers.find(d => d.id === wl.driverId);
                      const caminhao = vehicles.find(v => v.id === wl.vehicleId);
                      
                      return (
                        <tr key={wl.id} className="text-xs text-slate-300 hover:bg-slate-955/40 transition duration-150" id={`tr-wl-${wl.id}`}>
                          <td className="py-3 px-3 font-mono text-slate-400">
                            {new Date(wl.startTime).toLocaleDateString('pt-BR')}
                          </td>
                          {isAdmin && (
                            <td className="py-3 px-3 font-medium text-white">
                              {motorista ? motorista.name : (wl.driverName || 'Motorista')}
                            </td>
                          )}
                          <td className="py-3 px-3">
                            <span className="font-semibold text-slate-200">{caminhao ? caminhao.model : 'Caminhão'}</span>
                            <span className="ml-1.5 px-2 py-0.5 tracking-tight font-mono bg-slate-950 rounded-lg border border-slate-800 text-[10px] text-slate-400">
                              {caminhao ? caminhao.plate : (wl.vehiclePlate || 'S/P')}
                            </span>
                          </td>
                          <td className="py-3 px-3 font-mono text-slate-350">{wl.totalHours.toFixed(1)} horas</td>
                          <td className="py-3 px-3 font-mono font-semibold text-emerald-400">
                            R$ {wl.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide ${
                              wl.status === 'pago' 
                                ? 'bg-emerald-950 text-emerald-400 border border-emerald-900/30' 
                                : wl.status === 'aprovado'
                                ? 'bg-indigo-950/50 text-indigo-400 border border-indigo-900/30'
                                : 'bg-amber-955/20 text-amber-500 border border-amber-900/20'
                            }`}>
                              {wl.status === 'pago' ? 'Pago' : wl.status === 'aprovado' ? 'Aprovado' : 'Aguardando ADM'}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-455 truncate max-w-[150px] italic" title={wl.tripDescription}>
                            {wl.tripDescription || 'Sem detalhes'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center font-mono" id="no-trips-txt">Nenhuma viagem registrada recentemente.</p>
            )}
          </div>
        </>
      )}

    </div>
  );
}
