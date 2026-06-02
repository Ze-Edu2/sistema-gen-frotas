/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Edit2, Check, X, AlertCircle, Search, LogIn,
  DollarSign, UserCheck, ShieldAlert, Phone, FileSpreadsheet, Lock 
} from 'lucide-react';
import { fleetStorage } from '../storage';
import { Driver } from '../types';

export default function DriversModule() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseType, setLicenseType] = useState('E');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [status, setStatus] = useState<'disponivel' | 'em_viagem' | 'ferias' | 'inativo'>('disponivel');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadDrivers();
  }, []);

  const loadDrivers = async () => {
    setLoading(true);
    try {
      const data = await fleetStorage.getDrivers();
      setDrivers(data);
    } catch (e) {
      setErrorMsg('Falha ao carregar motoristas.');
    } finally {
      setLoading(false);
    }
  };

  const clearForm = () => {
    setEditingId(null);
    setName('');
    setCpf('');
    setPhone('');
    setLicenseType('E');
    setLicenseNumber('');
    setHourlyRate('');
    setStatus('disponivel');
    setUsername('');
    setPassword('');
  };

  const handleEdit = (driver: Driver) => {
    setEditingId(driver.id);
    setName(driver.name);
    setCpf(driver.cpf);
    setPhone(driver.phone);
    setLicenseType(driver.licenseType);
    setLicenseNumber(driver.licenseNumber);
    setHourlyRate(driver.hourlyRate.toString());
    setStatus(driver.status);
    setUsername(driver.username);
    setPassword(''); // Não preenchemos a senha por padrão para segurança, apenas se ele quiser alterar
    setShowAddForm(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir o motorista ${name}? Isso removerá seus históricos.`)) {
      return;
    }
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await fleetStorage.deleteDriver(id);
      setSuccessMsg(`Motorista ${name} removido com sucesso.`);
      loadDrivers();
    } catch (e) {
      setErrorMsg('Falha ao excluir motorista.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || !cpf || !phone || !licenseNumber || !hourlyRate || !username) {
      setErrorMsg('Preencha todos os campos obrigatórios.');
      return;
    }

    const rateVal = parseFloat(hourlyRate);
    if (isNaN(rateVal) || rateVal < 0) {
      setErrorMsg('O salário/pago por hora deve ser um valor numérico válido.');
      return;
    }

    try {
      // Validação de Usuário Duplicado Local
      const cleanedUser = username.trim().toLowerCase();
      const userExists = drivers.some(
        d => d.username.toLowerCase() === cleanedUser && d.id !== editingId
      );
      if (userExists) {
        setErrorMsg('Este nome de usuário já está associado a outro motorista.');
        return;
      }

      const cpfExists = drivers.some(
        d => d.cpf.replace(/\D/g, '') === cpf.replace(/\D/g, '') && d.id !== editingId
      );
      if (cpfExists) {
        setErrorMsg('Este CPF já está cadastrado.');
        return;
      }

      const payload: Driver = {
        id: editingId || crypto.randomUUID(),
        name: name.trim(),
        cpf: cpf.trim(),
        phone: phone.trim(),
        licenseType,
        licenseNumber: licenseNumber.trim(),
        hourlyRate: rateVal,
        status,
        username: cleanedUser,
        createdAt: new Date().toISOString()
      };

      if (password) {
        payload.password = password; // Se alterou ou inseriu nova senha
      }

      await fleetStorage.saveDriver(payload);
      setSuccessMsg(editingId ? 'Dados do motorista atualizados.' : 'Novo motorista cadastrado com sucesso!');
      clearForm();
      setShowAddForm(false);
      loadDrivers();
    } catch (error) {
      setErrorMsg('Ocorreu um erro ao gravar as informações no banco de dados.');
    }
  };

  // Filtrar motoristas por busca
  const filteredDrivers = drivers.filter(d => 
    d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.cpf.includes(searchQuery) ||
    d.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6" id="drivers-module-root">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4" id="drivers-heading">
        <div>
          <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
            <Users className="h-5.5 w-5.5 text-blue-400" />
            Gerenciamento de Motoristas (Caminhoneiros)
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Cadastre novos caminhoneiros, gerencie taxas de pagamento por hora e configure senhas de acesso aos aplicativos.
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
            <span>{showAddForm ? 'Cancelar Cadastro' : 'Cadastrar Caminhoneiro'}</span>
          </button>
        </div>
      </div>

      {/* Alertas */}
      {errorMsg && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-200 text-xs flex items-center gap-2" id="drivers-error">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-200 text-xs flex items-center gap-2" id="drivers-success">
          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Form de Cadastro / Edição */}
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 space-y-4" id="driver-form">
          <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-700 pb-2">
            {editingId ? 'Editar Caminhoneiro' : 'Ficha de Cadastro do Motorista'}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" id="driver-form-row-1">
            
            {/* Nome */}
            <div className="md:col-span-2">
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-name">
                Nome Completo *
              </label>
              <input
                id="drv-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex. João de Souza Silva"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* CPF */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-cpf">
                CPF *
              </label>
              <input
                id="drv-cpf"
                type="text"
                value={cpf}
                onChange={(e) => setCpf(e.target.value)}
                placeholder="000.000.000-00"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4" id="driver-form-row-2">
            
            {/* Telefone */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-phone">
                Telefone/WhatsApp *
              </label>
              <input
                id="drv-phone"
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 98765-4321"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Categoria CNH */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-lic-type">
                Categoria CNH *
              </label>
              <select
                id="drv-lic-type"
                value={licenseType}
                onChange={(e) => setLicenseType(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="C">Categoria C</option>
                <option value="D">Categoria D</option>
                <option value="E">Categoria E (Articulado/Bi-trem)</option>
              </select>
            </div>

            {/* Registro CNH */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-lic-num">
                Nº Registro CNH *
              </label>
              <input
                id="drv-lic-num"
                type="text"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                placeholder="11 dígitos"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Valor Pago por Hora */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-rate">
                Faturamento por Hora (R$) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">
                  R$
                </span>
                <input
                  id="drv-rate"
                  type="number"
                  step="0.01"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(e.target.value)}
                  placeholder="Ex. 45.00"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-2" id="driver-form-row-3">
            
            {/* Usuário de Login */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-user">
                Nome de Usuário (Para Login) *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">
                  @
                </span>
                <input
                  id="drv-user"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ex: joao_silva"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Senha de Acesso */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-pass">
                Senha de Acesso {editingId && '(deixe em branco para não alterar)'} *
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-slate-500 text-xs">
                  <Lock className="w-3.5 h-3.5" />
                </span>
                <input
                  id="drv-pass"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status do Motorista */}
            <div>
              <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="drv-status">
                Status Operacional *
              </label>
              <select
                id="drv-status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
              >
                <option value="disponivel">Disponível em Pátio</option>
                <option value="em_viagem">Ativo em Viagem</option>
                <option value="ferias">Em Férias</option>
                <option value="inativo">Inativo / Desligado</option>
              </select>
            </div>

          </div>

          <div className="flex justify-end gap-2 pt-2" id="driver-form-submit">
            <button
              type="button"
              onClick={clearForm}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-650 rounded-xl cursor-pointer"
            >
              Limpar Campos
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg transition-transform hover:scale-[1.01] cursor-pointer"
            >
              {editingId ? 'Salvar Edições' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      )}

      {/* Barra de Pesquisa */}
      <div className="bg-slate-800 border border-slate-700/60 rounded-xl p-3 flex items-center gap-3" id="drivers-search-bar">
        <div className="relative flex-1">
          <Search className="absolute inset-y-0 left-0 pl-3 flex items-center h-full text-slate-500 w-4.5" />
          <input
            type="text"
            placeholder="Buscar por nome, CPF ou usuário de acesso..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-[10px] text-slate-400 font-mono">
          Total: {filteredDrivers.length} de {drivers.length} motorista(s)
        </div>
      </div>

      {/* Lista de Motoristas */}
      {loading ? (
        <div className="text-center py-10" id="drivers-loading">
          <span className="text-slate-400 text-sm">Buscando motoristas cadastrados...</span>
        </div>
      ) : filteredDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="drivers-grid">
          {filteredDrivers.map(d => (
            <div key={d.id} className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 hover:border-slate-600/80 transition-all flex flex-col justify-between" id={`driver-card-${d.id}`}>
              <div>
                <div className="flex items-start justify-between gap-2 border-b border-slate-700/50 pb-3 mb-3">
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold text-white truncate max-w-[170px]" title={d.name}>
                      {d.name}
                    </h4>
                    <p className="text-slate-500 text-[10px] uppercase font-mono tracking-wider mt-0.5">
                      CPF: {d.cpf}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-semibold tracking-wide shrink-0 ${
                    d.status === 'disponivel' ? 'bg-emerald-950 text-emerald-400 border border-emerald-950' :
                    d.status === 'em_viagem' ? 'bg-blue-950 text-blue-400 border border-blue-950' :
                    d.status === 'ferias' ? 'bg-amber-950 text-amber-400 border border-amber-950' :
                    'bg-red-950 text-red-400 border border-red-950'
                  }`}>
                    {d.status === 'disponivel' ? 'Disponível' :
                     d.status === 'em_viagem' ? 'Em Viagem' :
                     d.status === 'ferias' ? 'Férias' : 'Inativo'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3 w-3 text-slate-500" />
                    <span>{d.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileSpreadsheet className="h-3 w-3 text-slate-500" />
                    <span>CNH: {d.licenseNumber} (Cat. {d.licenseType})</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-700/30">
                    <LogIn className="h-3 w-3 text-slate-500" />
                    <span>Acesso: <strong className="text-slate-300 font-mono">@{d.username}</strong></span>
                  </div>
                </div>
              </div>

              {/* Ações e Valor por Hora */}
              <div className="flex items-center justify-between gap-4 mt-5 pt-3 border-t border-slate-700/50">
                <div className="flex flex-col">
                  <span className="text-[10px] text-slate-500">VALOR/HORA</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    R$ {d.hourlyRate.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleEdit(d)}
                    title="Editar informações"
                    className="p-1.5 transition-colors bg-slate-700 text-slate-300 hover:text-white rounded-lg hover:bg-slate-600 cursor-pointer"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(d.id, d.name)}
                    title="Excluir motorista"
                    className="p-1.5 transition-colors bg-slate-700 text-red-400 hover:text-red-300 rounded-lg hover:bg-red-950/20 cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

            </div>
          ))}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-2xl p-8 border border-slate-700/60 text-center" id="drivers-empty">
          <p className="text-slate-400 text-xs">
            {searchQuery ? 'Nenhum motorista corresponde à sua pesquisa.' : 'Nenhum caminhoneiro cadastrado até o momento.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 underline font-semibold cursor-pointer"
            >
              <span>Cadastrar o primeiro caminhoneiro agora</span>
            </button>
          )}
        </div>
      )}

    </div>
  );
}
