/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Truck, Plus, Trash2, Edit2, Check, X, AlertCircle, Search, Calendar,
  Activity, Settings, Weight 
} from 'lucide-react';
import { fleetStorage } from '../storage';
import { Vehicle } from '../types';

export default function FleetModule() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [plate, setPlate] = useState('');
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [year, setYear] = useState('');
  const [capacity, setCapacity] = useState('');
  const [status, setStatus] = useState<'ativo' | 'manutencao' | 'inativo'>('ativo');
  const [nextMaintenanceDate, setNextMaintenanceDate] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    setLoading(true);
    try {
      const data = await fleetStorage.getVehicles();
      setVehicles(data);
    } catch (e) {
      setErrorMsg('Falha ao carregar veículos de frota.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setPlate('');
    setModel('');
    setBrand('');
    setYear('');
    setCapacity('');
    setStatus('ativo');
    setNextMaintenanceDate('');
  };

  const handleEdit = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setPlate(vehicle.plate);
    setModel(vehicle.model);
    setBrand(vehicle.brand);
    setYear(vehicle.year?.toString() || '');
    setCapacity(vehicle.capacity?.toString() || '');
    setStatus(vehicle.status);
    setNextMaintenanceDate(vehicle.nextMaintenanceDate || '');
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, plate: string) => {
    if (!window.confirm(`Tem certeza que deseja remover o veículo de placa ${plate}?`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fleetStorage.deleteVehicle(id);
      setSuccessMsg(`Veículo placa ${plate} removido.`);
      loadVehicles();
    } catch (e) {
      setErrorMsg('Falha ao excluir o veículo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!plate || !model || !brand || !year || !capacity) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    const yearVal = parseInt(year);
    if (isNaN(yearVal) || yearVal < 1950 || yearVal > 2030) {
      setErrorMsg('Insira um ano de fabricação válido (entre 1950 e 2030).');
      return;
    }

    const capVal = parseFloat(capacity);
    if (isNaN(capVal) || capVal <= 0) {
      setErrorMsg('A capacidade de carga deve ser maior que zero (em toneladas).');
      return;
    }

    // Formata a placa para caixa alta
    const formattedPlate = plate.trim().toUpperCase();

    try {
      // Valida placa duplicada localmente
      const plateExists = vehicles.some(
        v => v.plate.toUpperCase() === formattedPlate && v.id !== editingId
      );
      if (plateExists) {
        setErrorMsg('Esta placa já está cadastrada em outro caminhão.');
        return;
      }

      const payload: Vehicle = {
        id: editingId || crypto.randomUUID(),
        plate: formattedPlate,
        model: model.trim(),
        brand: brand.trim(),
        year: yearVal,
        capacity: capVal,
        status,
        nextMaintenanceDate: nextMaintenanceDate || undefined,
        createdAt: new Date().toISOString()
      };

      await fleetStorage.saveVehicle(payload);
      setSuccessMsg(editingId ? 'Dados do caminhão atualizados.' : 'Veículo inserido na frota com sucesso!');
      clearForm();
      setShowAddForm(false);
      loadVehicles();
    } catch (error) {
      setErrorMsg('Erro ao gravar caminhão no banco de dados.');
    }
  };

  const filteredVehicles = vehicles.filter(v =>
    v.plate.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="fleet-module-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="fleet-heading">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <Truck className="h-5.5 w-5.5 text-blue-400" />
            Controle de Frota (Caminhões)
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Mapeie os veículos ativos, acompanhe as manutenções e o uso de carga das máquinas.
          </p>
        </div>
        <div>
          <button
            onClick={() => {
              if (showAddForm) {
                clearForm();
              }
              setShowAddForm(!showAddForm);
            }}
            className="w-full sm:w-auto px-4 py-2 transition-all text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/10 cursor-pointer"
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            <span>{showAddForm ? 'Cancelar' : 'Cadastrar Caminhão'}</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2" id="fleet-error">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2" id="fleet-success">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form Cadastro / Edição */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 space-y-4" id="vehicle-form">
          <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-2">
            {editingId ? 'Editar Detalhes do Caminhão' : 'Cadastrar Novo Veículo na Frota'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4" id="vehicle-form-row-1">
            
            {/* Placa */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-plate">
                Placa do Veículo *
              </label>
              <input
                id="veh-plate"
                type="text"
                value={plate}
                onChange={(e) => setPlate(e.target.value)}
                placeholder="ABC-1234 ou ABC1D23"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono text-center tracking-wider font-semibold placeholder:font-sans placeholder:font-normal"
              />
            </div>

            {/* Marca */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-brand">
                Marca / Fabricante *
              </label>
              <input
                id="veh-brand"
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex. Scania, Volvo, Mercedes"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Modelo */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-model">
                Modelo do Caminhão *
              </label>
              <input
                id="veh-model"
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="Ex. R450 Streamline, FH 540"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="vehicle-form-row-2">
            
            {/* Ano */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-year">
                Ano de Fabricação *
              </label>
              <input
                id="veh-year"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="Ex. 2021"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Capacidade de Carga em toneladas */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-capacity">
                Capacidade Máxima (Toneladas) *
              </label>
              <div className="relative">
                <input
                  id="veh-capacity"
                  type="number"
                  step="0.1"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="Ex. 27.5"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-8 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 text-[10px] font-semibold">
                  toneladas
                </span>
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-status">
                Status Operacional *
              </label>
              <select
                id="veh-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="ativo">Ativo operando</option>
                <option value="manutencao">Parado em Manutenção</option>
                <option value="inativo">Inativo / Desativado</option>
              </select>
            </div>

            {/* Próxima Manutenção Preventiva */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="veh-mdate">
                Próxima Manutenção Preventiva
              </label>
              <input
                id="veh-mdate"
                type="date"
                value={nextMaintenanceDate}
                onChange={(e) => setNextMaintenanceDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-2" id="vehicle-form-submit">
            <button
              type="button"
              onClick={clearForm}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-650 rounded-xl cursor-pointer"
            >
              Limpar
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition-transform hover:scale-[1.01] cursor-pointer"
            >
              {editingId ? 'Salvar Mudanças' : 'Cadastrar Veículo'}
            </button>
          </div>
        </form>
      )}

      {/* Barra de Pesquisa */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3" id="fleet-search-bar">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center h-full text-slate-500 w-4.5" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo ou fabricante..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Total: {filteredVehicles.length} de {vehicles.length} caminhão(ões)
        </div>
      </div>

      {/* Grid de Veículos */}
      {loading ? (
        <div className="text-center py-10" id="fleet-loading">
          <span className="text-slate-400 text-sm">Atualizando frotas...</span>
        </div>
      ) : filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="fleet-grid">
          {filteredVehicles.map(v => (
            <div key={v.id} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600/80 transition-all flex flex-col justify-between" id={`vehicle-card-${v.id}`}>
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-700/50 pb-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Truck className="h-4 w-4 text-slate-400 shrink-0" />
                      <h4 className="text-sm font-semibold text-white truncate max-w-[150px]">
                        {v.brand} {v.model}
                      </h4>
                    </div>
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider mt-1">
                      Ano: {v.year}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide shrink-0 ${
                    v.status === 'ativo' ? 'bg-emerald-950 text-emerald-400 border border-emerald-950/20' :
                    v.status === 'manutencao' ? 'bg-amber-950 text-amber-400 border border-amber-950/20' :
                    'bg-red-950 text-red-400 border border-red-950/20'
                  }`}>
                    {v.status === 'ativo' ? 'Ativo' :
                     v.status === 'manutencao' ? 'Em Manutenção' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-750 font-mono text-center">
                    <span className="text-[10px] text-slate-500">PLACA REGISTRADA</span>
                    <span className="text-xs font-bold text-white tracking-widest">{v.plate}</span>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs">
                    <Weight className="h-3.5 w-3.5 text-slate-500" />
                    <span>Lotação: <strong className="text-slate-300 font-mono">{v.capacity}</strong> toneladas de carga útil</span>
                  </div>

                  {v.nextMaintenanceDate ? (
                    <div className="flex items-center gap-1.5 text-xs text-slate-450 border-t border-slate-700/30 pt-2">
                      <Calendar className="h-3.5 w-3.5 text-slate-500" />
                      <span>Manutenção: <strong className="text-slate-300 font-mono">{new Date(v.nextMaintenanceDate).toLocaleDateString('pt-BR')}</strong></span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 border-t border-slate-700/30 pt-2 italic">
                      <Calendar className="h-3.5 w-3.5 text-slate-600" />
                      <span>Sem previsão de manutenção agendada</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center justify-end gap-1.5 mt-5 pt-3 border-t border-slate-700/50">
                <button
                  onClick={() => handleEdit(v)}
                  title="Editar dados"
                  className="p-1.5 transition-colors bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 cursor-pointer"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(v.id, v.plate)}
                  title="Remover veículo"
                  className="p-1.5 transition-colors bg-slate-700 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/20 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700/60 text-center" id="fleet-empty">
          <p className="text-slate-400 text-xs">
            {searchQuery ? 'Nenhum veículo corresponde à sua busca.' : 'Não há caminhões cadastrados na frota do pátio.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
            >
              <span>Cadastrar o primeiro caminhão agora</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
