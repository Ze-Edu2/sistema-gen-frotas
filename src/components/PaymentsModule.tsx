/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  DollarSign, FileText, CheckCircle2, ChevronDown, ListFilter, Calendar,
  CreditCard, CreditCard as PixIcon, User, RefreshCw, AlertCircle, Plus, Receipt, X
} from 'lucide-react';
import { fleetStorage } from '../storage';
import { Payment, Driver, WorkLog } from '../types';

export default function PaymentsModule() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('PIX');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [notes, setNotes] = useState('');

  // Cálculos dinâmicos em tempo real
  const [calculateUnpaidHours, setCalculateUnpaidHours] = useState(0);
  const [calculateUnpaidAmount, setCalculateUnpaidAmount] = useState(0);
  const [unpaidLogsToProcess, setUnpaidLogsToProcess] = useState<WorkLog[]>([]);

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  // Monitora a seleção do motorista para calcular o faturamento pendente dele
  useEffect(() => {
    if (!selectedDriverId) {
      setCalculateUnpaidHours(0);
      setCalculateUnpaidAmount(0);
      setUnpaidLogsToProcess([]);
      return;
    }

    const unpaids = workLogs.filter(
      wl => wl.driverId === selectedDriverId && wl.status === 'aprovado'
    );

    const totalHrs = unpaids.reduce((acc, curr) => acc + curr.totalHours, 0);
    const totalCash = unpaids.reduce((acc, curr) => acc + curr.totalEarnings, 0);

    setCalculateUnpaidHours(totalHrs);
    setCalculateUnpaidAmount(totalCash);
    setUnpaidLogsToProcess(unpaids);

    // Bolar datas padrão de período baseados nas viagens processadas do motorista
    if (unpaids.length > 0) {
      const dates = unpaids.map(wl => new Date(wl.startTime).getTime());
      const minDate = new Date(Math.min(...dates)).toISOString().split('T')[0];
      const maxDate = new Date(Math.max(...dates)).toISOString().split('T')[0];
      setPeriodStart(minDate);
      setPeriodEnd(maxDate);
    } else {
      setPeriodStart('');
      setPeriodEnd('');
    }
  }, [selectedDriverId, workLogs]);

  const loadAllData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const pList = await fleetStorage.getPayments();
      const dList = await fleetStorage.getDrivers();
      const wList = await fleetStorage.getWorkLogs();

      setPayments(pList);
      setDrivers(dList);
      setWorkLogs(wList);
    } catch (e) {
      setErrorMsg('Falha ao obter histórico de pagamentos.');
    } finally {
      setLoading(false);
    }
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!selectedDriverId) {
      setErrorMsg('Selecione um caminhoneiro para processar.');
      return;
    }

    if (unpaidLogsToProcess.length === 0) {
      setErrorMsg('Este motorista não possui nenhuma jornada de trabalho APROVADA pendente de faturamento.');
      return;
    }

    if (!periodStart || !periodEnd) {
      setErrorMsg('Informe o intervalo de datas do período de faturamento.');
      return;
    }

    try {
      // Cria o registro do pagamento
      const pId = crypto.randomUUID();
      const driverObj = drivers.find(d => d.id === selectedDriverId);
      
      const newPayment: Payment = {
        id: pId,
        driverId: selectedDriverId,
        driverName: driverObj?.name || 'Motorista',
        hoursBilled: calculateUnpaidHours,
        amountPaid: calculateUnpaidAmount,
        paymentDate: new Date().toISOString(),
        periodStart,
        periodEnd,
        notes: notes.trim(),
        paymentMethod,
        status: 'concluido',
        createdAt: new Date().toISOString()
      };

      // Grava pagamento no Supabase / Local
      await fleetStorage.savePayment(newPayment);

      // Atualiza todos os WorkLogs selecionados como "pago"
      for (const wl of unpaidLogsToProcess) {
        await fleetStorage.saveWorkLog({
          ...wl,
          status: 'pago'
        });
      }

      setSuccessMsg(`Pagamento de R$ ${calculateUnpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} efetuado com sucesso! ${unpaidLogsToProcess.length} jornada(s) fechada(s).`);
      
      // Limpar
      setSelectedDriverId('');
      setNotes('');
      setPeriodStart('');
      setPeriodEnd('');
      setShowAddForm(false);
      
      // Recarregar
      loadAllData();
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao concluir fechamento do pagamento.');
    }
  };

  return (
    <div className="space-y-6" id="payments-module-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="payments-heading">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <DollarSign className="h-5.5 w-5.5 text-emerald-400" />
            Controle de Pagamento por Hora
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Gere fechamento de folha de pagamento por hora baseados na soma das jornadas aprovadas dos caminhoneiros.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              setSelectedDriverId('');
              setShowAddForm(!showAddForm);
            }}
            className="w-full sm:w-auto px-4 py-2 transition-all text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showAddForm ? 'Cancelar Fechamento' : 'Realizar Pagamento'}</span>
          </button>
        </div>
      </div>

      {/* Mensagens de Sucesso / Erro */}
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2" id="pay-error">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2" id="pay-success">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Formulário de faturamento */}
      {showAddForm && (
        <form onSubmit={handlePay} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 space-y-4" id="payment-form">
          <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-2 flex items-center gap-1.5">
            <Receipt className="h-4 w-4 text-blue-400" />
            Processar Fechamento de Horas Trabalhadas
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="pay-form-row-1">
            
            {/* Escolha do Caminhoneiro */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="pay-driver">
                Selecione o Caminhoneiro *
              </label>
              <select
                id="pay-driver"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">-- Escolha um motorista para consultar --</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name} (CNH {d.licenseType}) - Valor: R$ {d.hourlyRate.toFixed(2)}/h
                  </option>
                ))}
              </select>
            </div>

            {/* Canal de Pagamento */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="pay-method">
                Método de Transferência *
              </label>
              <select
                id="pay-method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="PIX">PIX Instanâneo</option>
                <option value="TED">TED / Banco Cadastrado</option>
                <option value="DEPOSITO">Depósito Identificado</option>
                <option value="DINHEIRO">Espécie (Dinheiro em caixa)</option>
              </select>
            </div>

          </div>

          {/* Cálculos Dinâmicos com base nas horas selecionadas do motorista */}
          {selectedDriverId && (
            <div className="bg-slate-900/60 p-4 border border-slate-750 rounded-xl" id="calculator-receipt-box">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Extrato de Horas Aprovadas Pendentes</h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="metrics-calc">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">VIAGENS DETECTADAS</span>
                  <div className="text-sm font-semibold text-white font-mono">{unpaidLogsToProcess.length} viagem(s)</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">HORAS COBRÁVEIS</span>
                  <div className="text-sm font-semibold text-white font-mono">{calculateUnpaidHours.toFixed(1)} horas</div>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] text-slate-500">VALOR LÍQUIDO A PAGAR</span>
                  <div className="text-sm font-bold text-emerald-400 font-mono">
                    R$ {calculateUnpaidAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {calculateUnpaidAmount === 0 && (
                <p className="text-[10px] text-amber-400 mt-3 bg-amber-500/5 p-2 rounded border border-amber-500/10 flex items-center gap-1.5 label text-left">
                  <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
                  <span>Não há faturamentos. Esse motorista já foi reembolsado por todas as jornadas aprovadas, ou suas viagens ainda não foram marcadas como "Aprovada" pelo ADM de tráfego.</span>
                </p>
              )}
            </div>
          )}

          {/* Período correspondente */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" id="pay-form-row-2">
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="start-date">
                Início do Período *
              </label>
              <input
                id="start-date"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="end-date">
                Fim do Período *
              </label>
              <input
                id="end-date"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="pay-notes">
              Notas adicionais / Comprovante
            </label>
            <input
              id="pay-notes"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Ref. viagens quinzena 2. Comprovante PIX id: 89a23c34"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2" id="pay-form-submit">
            <button
              type="button"
              onClick={() => {
                setSelectedDriverId('');
                setShowAddForm(false);
              }}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-650 rounded-xl cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={calculateUnpaidAmount <= 0}
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl shadow-lg transition-transform hover:scale-[1.01] cursor-pointer"
            >
              Efetuar Baixa de Pagamento
            </button>
          </div>
        </form>
      )}

      {/* Lista de Recibos efetuados */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5" id="payments-history-section">
        <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-3 mb-4">
          Histórico Geral de Comprovantes Gerados
        </h3>

        {loading ? (
          <p className="text-xs text-slate-400 text-center py-6" id="pay-loading-msg">Buscando histórico na nuvem...</p>
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto" id="payments-table-container">
            <table className="w-full text-left border-collapse" id="payments-table">
              <thead>
                <tr className="border-b border-slate-700 text-slate-450 text-xs">
                  <th className="py-2 px-3 font-semibold">Caminhoneiro</th>
                  <th className="py-2 px-3 font-semibold">Data Payout</th>
                  <th className="py-2 px-3 font-semibold text-center">Horas Fechadas</th>
                  <th className="py-2 px-3 font-semibold">Canal</th>
                  <th className="py-2 px-3 font-semibold">Ref. Período</th>
                  <th className="py-2 px-3 font-semibold text-right">Valor Líquido</th>
                  <th className="py-2 px-3 font-semibold">Notas / Recibo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/40 text-xs">
                {payments.slice().reverse().map(p => (
                  <tr key={p.id} className="text-slate-300 hover:bg-slate-705/30" id={`p-row-${p.id}`}>
                    <td className="py-3 px-3">
                      <span className="font-semibold text-white">{p.driverName || 'Motorista'}</span>
                    </td>
                    <td className="py-3 px-3 font-mono">
                      {new Date(p.paymentDate).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 text-center font-mono">
                      {p.hoursBilled.toFixed(1)}h
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-1.5 py-0.5 bg-slate-900 border border-slate-750 text-[10px] text-slate-400 font-bold uppercase rounded">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                      {new Date(p.periodStart).toLocaleDateString('pt-BR')} até {new Date(p.periodEnd).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-emerald-400">
                      R$ {p.amountPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-slate-450 truncate max-w-[150px]" title={p.notes}>
                      {p.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-slate-500 py-3 text-center" id="pay-empty-msg">Nenhum pagamento emitido ainda no sistema.</p>
        )}
      </div>

    </div>
  );
}
