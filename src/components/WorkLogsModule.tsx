/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Clock, Play, Square, Check, X, AlertCircle, FileText, Filter, CheckCircle2,
  Calendar, User, Truck, DollarSign, RefreshCw, AlertTriangle, ArrowRight 
} from 'lucide-react';
import { fleetStorage } from '../storage';
import { WorkLog, Driver, Vehicle, LoggedUser } from '../types';

interface WorkLogsModuleProps {
  user: LoggedUser;
}

export default function WorkLogsModule({ user }: WorkLogsModuleProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Driver Mode State
  const [activeLog, setActiveLog] = useState<WorkLog | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [tripDescription, setTripDescription] = useState('');
  const [activeElapsedText, setActiveElapsedText] = useState('00h 00m 00s');

  // Filter State (for Admins)
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [driverFilter, setDriverFilter] = useState<string>('todos');

  useEffect(() => {
    loadAllData();
  }, []);

  // Timer effect for the Active Driver's Trip
  useEffect(() => {
    if (!activeLog) return;
    
    const interval = setInterval(() => {
      const start = new Date(activeLog.startTime).getTime();
      const now = new Date().getTime();
      const diffMs = now - start;

      if (diffMs < 0) {
        setActiveElapsedText("00h 00m 00s");
        return;
      }

      const totalSecs = Math.floor(diffMs / 1000);
      const hours = Math.floor(totalSecs / 3600);
      const minutes = Math.floor((totalSecs % 3600) / 60);
      const seconds = totalSecs % 60;

      const pad = (num: number) => num.toString().padStart(2, '0');
      setActiveElapsedText(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    }, 1000);

    return () => clearInterval(interval);
  }, [activeLog]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const dList = await fleetStorage.getDrivers();
      const vList = await fleetStorage.getVehicles();
      const wList = await fleetStorage.getWorkLogs();

      setDrivers(dList);
      setVehicles(vList);
      setWorkLogs(wList);

      // Se for Motorista, checar se ele já possui alguma jornada em andamento (endTime é nulo)
      if (user.role === 'driver') {
        const ongoing = wList.find(wl => wl.driverId === user.driverId && !wl.endTime);
        if (ongoing) {
          setActiveLog(ongoing);
        } else {
          setActiveLog(null);
        }
      }
    } catch (e) {
      setErrorMsg('Falha ao sincronizar dados da jornada.');
    } finally {
      setLoading(false);
    }
  };

  // --- MOTORISTA: INICIAR JORNADA ---
  const handleStartTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedVehicleId) {
      setErrorMsg('Selecione o caminhão que você irá pilotar.');
      return;
    }

    if (!tripDescription.trim()) {
      setErrorMsg('Descreva a rota ou objetivo da viagem (ex: Entrega de soja em Santos).');
      return;
    }

    const linkedDriver = drivers.find(d => d.id === user.driverId);
    if (!linkedDriver) {
      setErrorMsg('Perfil de motorista não encontrado no banco de dados.');
      return;
    }

    try {
      const newLog: WorkLog = {
        id: crypto.randomUUID(),
        driverId: user.driverId!,
        driverName: linkedDriver.name,
        vehicleId: selectedVehicleId,
        startTime: new Date().toISOString(),
        endTime: null,
        totalHours: 0,
        hourlyRateApplied: linkedDriver.hourlyRate,
        totalEarnings: 0,
        tripDescription: tripDescription.trim(),
        status: 'pendente_aprovacao', // Padrão ou será alterado após finalizar
        createdAt: new Date().toISOString()
      };

      // Salva jornada ativa
      await fleetStorage.saveWorkLog(newLog);
      
      // Altera o status do motorista para 'em_viagem'
      await fleetStorage.saveDriver({
        ...linkedDriver,
        status: 'em_viagem'
      });

      // Altera o status do veículo para 'ativo' se necessário
      const targetVeh = vehicles.find(v => v.id === selectedVehicleId);
      if (targetVeh) {
        await fleetStorage.saveVehicle({
          ...targetVeh,
          status: 'ativo'
        });
      }

      setSuccessMsg('Boa viagem! Jornada de trabalho iniciada e registrada no Supabase.');
      setTripDescription('');
      setSelectedVehicleId('');
      loadAllData();
    } catch (err) {
      setErrorMsg('Erro ao registrar início de jornada.');
    }
  };

  // --- MOTORISTA: CONCLUIR JORNADA ---
  const handleEndTrip = async () => {
    if (!activeLog) return;
    if (!window.confirm('Confirma a finalização da sua jornada de trabalho agora?')) {
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');

    const linkedDriver = drivers.find(d => d.id === user.driverId);
    if (!linkedDriver) {
      setErrorMsg('Erro ao carregar o motorista associado.');
      return;
    }

    try {
      const endTimeStr = new Date().toISOString();
      const startTimeMs = new Date(activeLog.startTime).getTime();
      const endTimeMs = new Date(endTimeStr).getTime();
      const diffHrs = Math.max(0.01, (endTimeMs - startTimeMs) / (1000 * 60 * 60)); // Horas fracionadas decimais

      const totalEarningsVal = diffHrs * activeLog.hourlyRateApplied;

      const updatedLog: WorkLog = {
        ...activeLog,
        endTime: endTimeStr,
        totalHours: diffHrs,
        totalEarnings: totalEarningsVal,
        status: 'pendente_aprovacao' // Aguarda aprovação do Admin
      };

      // Grava log de encerramento
      await fleetStorage.saveWorkLog(updatedLog);

      // Libera motorista para 'disponivel'
      await fleetStorage.saveDriver({
        ...linkedDriver,
        status: 'disponivel'
      });

      setSuccessMsg(`Jornada encerrada com sucesso! Total trabalhado: ${diffHrs.toFixed(2)}h. Aguardando aprovação do Admin.`);
      setActiveLog(null);
      loadAllData();
    } catch (e) {
      setErrorMsg('Erro ao salvar finalização de jornada.');
    }
  };

  // --- ADMIN: APROVAR JORNADA ---
  const handleApproveLog = async (log: WorkLog) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fleetStorage.saveWorkLog({
        ...log,
        status: 'aprovado',
        approvedBy: user.id,
        approvedAt: new Date().toISOString()
      });
      setSuccessMsg('Jornada aprovada com sucesso! Pronta para faturamento de pagamento.');
      loadAllData();
    } catch (e) {
      setErrorMsg('Falha ao aprovar jornada.');
    }
  };

  // --- ADMIN: EXCLUIR REGISTRO ---
  const handleDeleteLog = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir permanentemente o registro desta jornada?')) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fleetStorage.deleteWorkLog(id);
      setSuccessMsg('Registro de jornada excluído.');
      loadAllData();
    } catch (e) {
      setErrorMsg('Falha ao excluir jornada.');
    }
  };

  // --- FILTERING ---
  const filteredLogs = workLogs.filter(wl => {
    // Filtro de motoristas para drivers logados
    if (user.role === 'driver' && wl.driverId !== user.driverId) return false;
    
    // Filtros de Admin
    if (user.role === 'admin') {
      if (driverFilter !== 'todos' && wl.driverId !== driverFilter) return false;
    }

    if (statusFilter !== 'todos') {
      if (wl.status !== statusFilter) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6" id="worklogs-module-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="worklogs-header">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <Clock className="h-5.5 w-5.5 text-blue-400" />
            Controle de Horas & Jornadas
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            {user.role === 'admin' 
              ? 'Acompanhe as viagens, valide horas de trabalho declaradas e aprove fechamentos.' 
              : 'Registre suas batidas de ponto ao iniciar e finalizar rotas.'}
          </p>
        </div>
        <div>
          <button
            onClick={loadAllData}
            className="p-2 bg-slate-800 hover:bg-slate-700/80 rounded-xl border border-slate-705/80 text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Sincronizar
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2" id="work-error">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2" id="work-success">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-10" id="work-loading">
          <span className="text-slate-400 text-sm">Carregando jornadas de trabalho...</span>
        </div>
      ) : (
        <>
          {/* --- INTERFACE EXCLUSIVA DO MOTORISTA --- */}
          {user.role === 'driver' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="driver-mode-container">
              
              {/* Painel de Batida de Ponto */}
              <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 lg:col-span-5 space-y-5" id="driver-punch-panel">
                <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-2">
                  Ponto Eletrônico de Bordo
                </h3>

                {activeLog ? (
                  // VIAGEM EM ANDAMENTO
                  <div className="bg-slate-900/60 border border-amber-500/20 rounded-2xl p-5 text-center space-y-4" id="trip-ongoing-card">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold tracking-wider uppercase animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                      Em Viagem
                    </div>

                    <div className="space-y-1">
                      <p className="text-slate-450 text-[11px] font-medium">TEMPO ACUMULADO CONTINUO</p>
                      <h4 className="text-3xl font-bold text-white font-mono tracking-tight glow-amber">
                        {activeElapsedText}
                      </h4>
                    </div>

                    {/* Descrição do caminhão operado */}
                    <div className="border-t border-b border-slate-800 py-3 text-xs text-left space-y-1.5">
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Caminhão:</strong> {
                          vehicles.find(v => v.id === activeLog.vehicleId) 
                            ? `${vehicles.find(v => v.id === activeLog.vehicleId)?.brand} ${vehicles.find(v => v.id === activeLog.vehicleId)?.model}` 
                            : 'Veículo da frotas'
                        }
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Placa:</strong> <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded tracking-wider border border-slate-750">{
                          vehicles.find(v => v.id === activeLog.vehicleId)?.plate || 'Placa'
                        }</span>
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Início:</strong> <span className="font-mono">{new Date(activeLog.startTime).toLocaleTimeString('pt-BR')} do dia {new Date(activeLog.startTime).toLocaleDateString('pt-BR')}</span>
                      </p>
                      <p className="text-slate-400">
                        <strong className="text-slate-300">Ganho/Hora Contratado:</strong> <span className="text-emerald-400 font-mono font-bold">R$ {activeLog.hourlyRateApplied.toFixed(2)}/h</span>
                      </p>
                      <p className="text-slate-450 italic mt-2 text-[11px]" title={activeLog.tripDescription}>
                        "{activeLog.tripDescription}"
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleEndTrip}
                      className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-red-900/30 cursor-pointer"
                    >
                      <Square className="h-4 w-4 fill-white" />
                      Finalizar Jornada (Bater Saída)
                    </button>
                  </div>
                ) : (
                  // DISPONÍVEL - PODE INICIAR VIAGEM
                  <form onSubmit={handleStartTrip} className="space-y-4" id="start-trip-form">
                    
                    <div className="bg-emerald-950/20 border border-emerald-900/30 text-emerald-300 p-3.5 rounded-xl text-xs flex gap-2">
                      <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-semibold">Liberado para Batida!</strong>
                        <span>Você está atualmente como **Disponível**. Preencha qual caminhão vai dirigir para iniciar a jornada.</span>
                      </div>
                    </div>

                    {/* Seleção do Veículo */}
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="select-vehicle">
                        Selecione o Caminhão *
                      </label>
                      <select
                        id="select-vehicle"
                        value={selectedVehicleId}
                        onChange={(e) => setSelectedVehicleId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                      >
                        <option value="">-- Escolha um caminhão da frota ativa --</option>
                        {vehicles.filter(v => v.status === 'ativo').map(v => (
                          <option key={v.id} value={v.id}>
                            [{v.plate}] {v.brand} {v.model} - Cap. {v.capacity}t
                          </option>
                        ))}
                      </select>
                      {vehicles.filter(v => v.status === 'ativo').length === 0 && (
                        <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Atenção: Não há caminhões disponíveis/ativos no momento. Peça ao ADM para ativá-los no módulo Frota.</span>
                        </p>
                      )}
                    </div>

                    {/* Descrição */}
                    <div>
                      <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="trip-desc">
                        Detalhamento do Roteiro/Carga *
                      </label>
                      <textarea
                        id="trip-desc"
                        rows={3}
                        value={tripDescription}
                        onChange={(e) => setTripDescription(e.target.value)}
                        placeholder="Ex: Saída da transportadora em Campinas (SP) com destino a Curitiba (PR). Carga: Autopeças."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 placeholder:text-slate-600"
                      ></textarea>
                    </div>

                    <button
                      type="submit"
                      disabled={vehicles.filter(v => v.status === 'ativo').length === 0}
                      className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-990/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Play className="h-4 w-4 fill-white" />
                      Iniciar Viagem (Bater Entrada)
                    </button>
                  </form>
                )}

              </div>

              {/* Histórico do Motorista */}
              <div className="bg-slate-850 border border-slate-700/50 rounded-2xl p-5 lg:col-span-7 flex flex-col justify-between" id="driver-trips-list">
                <div>
                  <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-2">
                    Suas Batidas e Faturamento Recente
                  </h3>

                  {filteredLogs.length > 0 ? (
                    <div className="space-y-3 mt-4 overflow-y-auto max-h-[300px] pr-1" id="driver-logs-scroll">
                      {filteredLogs.map(wl => {
                        const cam = vehicles.find(v => v.id === wl.vehicleId);
                        return (
                          <div key={wl.id} className="p-3 bg-slate-900/60 border border-slate-750 rounded-xl flex items-center justify-between gap-4 text-xs" id={`wl-row-${wl.id}`}>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">Placa: {cam ? cam.plate : (wl.vehiclePlate || 'S/P')}</span>
                                <span className="text-slate-500">•</span>
                                <span className="font-mono text-[10px] text-slate-450">{new Date(wl.startTime).toLocaleDateString('pt-BR')}</span>
                              </div>
                              <p className="text-slate-400 text-[11px] truncate max-w-[250px] italic">"{wl.tripDescription}"</p>
                              <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                <span>{wl.totalHours > 0 ? `${wl.totalHours.toFixed(1)}h trabalhadas` : 'Em andamento'}</span>
                                {wl.totalHours > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>Taxa: R$ {wl.hourlyRateApplied.toFixed(2)}/h</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end shrink-0">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold mb-1 border ${
                                wl.status === 'pago' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/30' :
                                wl.status === 'aprovado' ? 'bg-blue-950 text-blue-400 border-blue-900/30' :
                                'bg-amber-950 text-amber-400 border-amber-900/30'
                              }`}>
                                {wl.status === 'pago' ? 'Pago' : wl.status === 'aprovado' ? 'Aprovado' : 'Aguardando ADM'}
                              </span>
                              {wl.totalHours > 0 && (
                                <span className="font-bold text-emerald-400 font-mono">
                                  R$ {wl.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-slate-550 flex flex-col items-center justify-center min-h-[220px]" id="logs-empty">
                      <FileText className="h-8 w-8 text-slate-650 mb-2" />
                      <span>Você ainda não registrou nenhuma viagem de trabalho nesta conta.</span>
                    </div>
                  )}
                </div>

                <div className="mt-5 p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between text-xs" id="driver-logs-footer">
                  <div className="space-y-0.5 text-slate-450">
                    <span>TOTAL GERAL ACUMULADO</span>
                    <p className="text-[10px]">(Horas Aprovadas ou Pagas)</p>
                  </div>
                  <div className="text-right">
                    <span className="block text-slate-400 font-mono font-medium">
                      {filteredLogs.filter(w => w.status === 'aprovado' || w.status === 'pago').reduce((a, b) => a + b.totalHours, 0).toFixed(1)} horas
                    </span>
                    <span className="block text-sm font-bold text-emerald-400 font-mono">
                      R$ {filteredLogs.filter(w => w.status === 'aprovado' || w.status === 'pago').reduce((a, b) => a + b.totalEarnings, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* --- INTERFACE EXCLUSIVA DO ADMINISTRADOR --- */}
          {user.role === 'admin' && (
            <div className="space-y-4" id="admin-mode-container">
              
              {/* Filtros Administrativos */}
              <div className="bg-slate-800 border border-slate-700/60 p-4 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between" id="admin-worklogs-filters">
                
                <div className="flex flex-wrap gap-3 w-full sm:w-auto">
                  {/* Status */}
                  <div className="flex flex-col">
                    <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Filtrar por Status</label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="todos">Todos os registros</option>
                      <option value="pendente_aprovacao">Aguardando Aprovação (Novas)</option>
                      <option value="aprovado">Aprovadas (Prontas para pagamento)</option>
                      <option value="pago">Pagas (Folha fechada)</option>
                    </select>
                  </div>

                  {/* Motorista */}
                  <div className="flex flex-col">
                    <label className="text-slate-400 text-[10px] uppercase font-bold tracking-wider mb-1">Filtrar Motorista</label>
                    <select
                      value={driverFilter}
                      onChange={(e) => setDriverFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                    >
                      <option value="todos">Todos os caminhoneiros</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="text-[10px] font-mono text-slate-450 whitespace-nowrap self-end">
                  Listando {filteredLogs.length} jornada(s)
                </div>

              </div>

              {/* Tabela Principal */}
              {filteredLogs.length > 0 ? (
                <div className="bg-slate-800 border border-slate-700/60 rounded-2xl overflow-hidden" id="admin-logs-table-box">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse" id="admin-logs-table">
                      <thead>
                        <tr className="bg-slate-900/65 border-b border-slate-700 text-slate-400 text-xs">
                          <th className="py-3 px-4 font-semibold">Motorista / CPF</th>
                          <th className="py-3 px-4 font-semibold">Caminhão / Placa</th>
                          <th className="py-3 px-4 font-semibold">Período / Rota</th>
                          <th className="py-3 px-4 font-semibold text-center">Horas</th>
                          <th className="py-3 px-4 font-semibold text-right">Valor Estimado</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 text-center font-semibold">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-700/40 text-xs">
                        {filteredLogs.map(wl => {
                          const motOr = drivers.find(d => d.id === wl.driverId);
                          const vehOr = vehicles.find(v => v.id === wl.vehicleId);
                          const formattedDate = new Date(wl.startTime).toLocaleDateString('pt-BR');
                          const hasFinished = wl.endTime !== null;
                          
                          return (
                            <tr key={wl.id} className="text-slate-300 hover:bg-slate-700/10" id={`adm-wl-${wl.id}`}>
                              {/* Motorista */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">{motOr ? motOr.name : (wl.driverName || 'Motorista')}</div>
                                <div className="text-[10px] text-slate-500 font-mono mt-0.5">CPF: {motOr ? motOr.cpf : 'CPF'}</div>
                              </td>

                              {/* Caminhão */}
                              <td className="py-3.5 px-4 font-mono">
                                <div className="text-slate-300 font-sans font-medium">{vehOr ? vehOr.model : 'Caminhão'}</div>
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 border border-slate-750 bg-slate-900 rounded text-[9px] text-slate-400 font-semibold tracking-wider">
                                  {vehOr ? vehOr.plate : (wl.vehiclePlate || 'S/P')}
                                </span>
                              </td>

                              {/* Rota/Período */}
                              <td className="py-3.5 px-4 space-y-1 max-w-[200px]">
                                <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                  <span>{formattedDate}</span>
                                  {hasFinished ? (
                                    <span className="text-[10px] font-mono text-slate-500">
                                      ({new Date(wl.startTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} até {new Date(wl.endTime!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})
                                    </span>
                                  ) : (
                                    <span className="text-[10px] bg-amber-950 text-amber-500 border border-amber-900/30 px-1.5 py-0.2 rounded animate-pulse">
                                      Em andamento
                                    </span>
                                  )}
                                </div>
                                <p className="text-slate-450 italic overflow-hidden text-ellipsis truncate block" title={wl.tripDescription}>
                                  "{wl.tripDescription || 'Sem detalhes'}"
                                </p>
                              </td>

                              {/* Horas */}
                              <td className="py-3.5 px-4 text-center font-mono font-medium">
                                {hasFinished ? (
                                  <span>{wl.totalHours.toFixed(1)}h</span>
                                ) : (
                                  <span className="text-slate-505">-</span>
                                )}
                              </td>

                              {/* Faturamento */}
                              <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">
                                {hasFinished ? (
                                  <span>R$ {wl.totalEarnings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                ) : (
                                  <span className="text-[10px] text-slate-500 font-sans italic">Sem tempo final</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-semibold border ${
                                  wl.status === 'pago' ? 'bg-emerald-950 text-emerald-400 border-emerald-900/35' :
                                  wl.status === 'aprovado' ? 'bg-blue-950 text-blue-400 border-blue-900/35' :
                                  'bg-amber-950 text-amber-400 border-amber-900/35'
                                }`}>
                                  {wl.status === 'pago' ? 'Pago' : wl.status === 'aprovado' ? 'Aprovado' : 'Aguardando'}
                                </span>
                              </td>

                              {/* Ações */}
                              <td className="py-3.5 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  {wl.status === 'pendente_aprovacao' && hasFinished && (
                                    <button
                                      onClick={() => handleApproveLog(wl)}
                                      title="Aprovar de forma rápida"
                                      className="p-1 px-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-[10px] font-semibold cursor-pointer transition-colors"
                                    >
                                      Aprovar
                                    </button>
                                  )}
                                  <button
                                    onClick={() => handleDeleteLog(wl.id)}
                                    title="Remover jornada"
                                    className="p-1 text-slate-400 hover:text-red-400 hover:bg-red-950/20 rounded cursor-pointer transition-colors"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-800 rounded-2xl p-10 border border-slate-700/65 text-center text-slate-500 text-xs" id="admin-logs-empty">
                  Sem registros de jornadas no filtro correspondente.
                </div>
              )}

            </div>
          )}
        </>
      )}

    </div>
  );
}
