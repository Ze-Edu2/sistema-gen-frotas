/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Truck, Shield, User as UserIcon, Lock, Key, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { fleetStorage } from '../storage';
import { LoggedUser } from '../types';

interface LoginProps {
  onLoginSuccess: (user: LoggedUser) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [role, setRole] = useState<'admin' | 'driver'>('admin');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Para cadastro do primeiro Admin se o banco estiver vazio
  const [hasAdmins, setHasAdmins] = useState(true);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminUser, setNewAdminUser] = useState('');
  const [newAdminPass, setNewAdminPass] = useState('');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAdmins();
  }, []);

  const checkAdmins = async () => {
    try {
      const admins = await fleetStorage.getAdmins();
      setHasAdmins(admins.length > 0);
    } catch (e) {
      setHasAdmins(false);
    }
  };

  const handleCreateFirstAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminName || !newAdminUser || !newAdminPass) {
      setErrorMsg('Preencha todos os campos do Administrador.');
      return;
    }
    setLoading(true);
    setErrorMsg('');
    try {
      const newAdmin = {
        id: crypto.randomUUID(),
        username: newAdminUser.trim().toLowerCase(),
        password: newAdminPass,
        name: newAdminName
      };
      await fleetStorage.createAdmin(newAdmin);
      setSuccessMsg('Primeiro Administrador cadastrado com sucesso! Faça login abaixo.');
      setHasAdmins(true);
      setUsername(newAdmin.username);
      setPassword(newAdmin.password);
    } catch (err) {
      setErrorMsg('Falha ao cadastrar administrador.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!username || !password) {
      setErrorMsg('Preencha o usuário e senha.');
      return;
    }

    setLoading(true);

    try {
      if (role === 'admin') {
        const admins = await fleetStorage.getAdmins();
        
        // Credencial de contingência caso ocorra algum problema de persistência
        if (admins.length === 0 && username === 'admin' && password === 'admin') {
          onLoginSuccess({
            id: 'admin-demo-id',
            username: 'admin',
            name: 'Administrador Demo',
            role: 'admin',
            driverId: null
          });
          setLoading(false);
          return;
        }

        const found = admins.find(
          a => a.username.toLowerCase() === username.toLowerCase() && a.password === password
        );

        if (found) {
          onLoginSuccess({
            id: found.id,
            username: found.username,
            name: found.name,
            role: 'admin',
            driverId: null
          });
        } else {
          setErrorMsg('Usuário ou senha de Administrador inválidos.');
        }
      } else {
        // Login de Caminhoneiro
        const drivers = await fleetStorage.getDrivers();
        const found = drivers.find(
          d => d.username.toLowerCase() === username.toLowerCase() && d.password === password
        );

        if (found) {
          if (found.status === 'inativo') {
            setErrorMsg('Este perfil de motorista está inativo no momento. Entre em contato com seu Administrador.');
            setLoading(false);
            return;
          }
          onLoginSuccess({
            id: found.id,
            username: found.username,
            name: found.name,
            role: 'driver',
            driverId: found.id
          });
        } else {
          setErrorMsg('Usuário ou senha de Caminhoneiro inválidos. Lembramos que as contas dos motoristas são criadas pelos Administradores no painel de controle.');
        }
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao processar o login. Verifique as configurações.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoAdmin = () => {
    setUsername('admin');
    setPassword('admin');
    setRole('admin');
    setErrorMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4" id="login-container">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 md:p-8" id="login-card">
        
        {/* Header da Marca */}
        <div className="flex flex-col items-center text-center mb-8" id="login-header">
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-2xl mb-3 border border-indigo-500/10" id="icon-container">
            <Truck className="h-10 w-10" />
          </div>
          <h1 className="text-xl font-bold font-sans text-white tracking-tight uppercase">
            TransRoute
          </h1>
          <p className="text-slate-400 text-xs mt-1">
            Gestão de Frota e Controle de Caminhoneiros
          </p>
        </div>

        {/* Notificações */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/20 border border-red-900/30 rounded-xl flex items-start gap-2.5 text-red-200 text-xs" id="login-error">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/20 border border-emerald-900/30 rounded-xl flex items-start gap-2.5 text-emerald-200 text-xs" id="login-success">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Cadastro do Primeiro Admin se necessário */}
        {!hasAdmins && (
          <div className="mb-6 p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl" id="first-admin-panel">
            <div className="flex gap-2 text-amber-400 text-xs font-semibold mb-2 items-center">
              <Key className="h-4 w-4" />
              <span>Nenhum Administrador encontrado. Crie um agora:</span>
            </div>
            <form onSubmit={handleCreateFirstAdmin} className="space-y-3">
              <input
                type="text"
                placeholder="Nome Completo do Admin"
                value={newAdminName}
                onChange={(e) => setNewAdminName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Usuário"
                  value={newAdminUser}
                  onChange={(e) => setNewAdminUser(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <input
                  type="password"
                  placeholder="Senha"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs py-2 rounded-xl transition-colors cursor-pointer"
              >
                {loading ? 'Cadastrando...' : 'Cadastrar Administrador'}
              </button>
            </form>
          </div>
        )}

        {/* Seletor de Perfil */}
        <div className="flex bg-slate-950 p-1 rounded-2xl mb-6 border border-slate-850" id="role-selector">
          <button
            type="button"
            id="btn-role-admin"
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
              role === 'admin'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setRole('admin');
              setErrorMsg('');
            }}
          >
            <Shield className="h-3.5 w-3.5" />
            Administrador (ADM)
          </button>
          <button
            type="button"
            id="btn-role-driver"
            className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-xl transition-all ${
              role === 'driver'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
            onClick={() => {
              setRole('driver');
              setErrorMsg('');
            }}
          >
            <UserIcon className="h-3.5 w-3.5" />
            Caminhoneiro (Motorista)
          </button>
        </div>

        {/* Formulário Principal de Login */}
        <form onSubmit={handleLogin} className="space-y-4" id="main-login-form">
          <div>
            <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="username-input">
              Nome de Usuário
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <UserIcon className="h-4 w-4" />
              </span>
              <input
                id="username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={role === 'admin' ? 'Nome do admin' : 'Usuário criado pelo ADM'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-medium mb-1.5" htmlFor="password-input">
              Senha de Acesso
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                <Lock className="h-4 w-4" />
              </span>
              <input
                id="password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            id="btn-submit-login"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm py-2.5 rounded-xl transition-all shadow-lg shadow-indigo-950/20 active:scale-[0.98] mt-2 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? 'Carregando...' : 'Acessar Sistema'}
          </button>
        </form>

        {/* Dicas e Acesso Rápido */}
        <div className="mt-6 pt-5 border-t border-slate-800 text-center text-xs text-slate-500 space-y-2" id="login-footer-info">
          {role === 'driver' ? (
            <div className="flex gap-1.5 items-start text-slate-400 bg-slate-950/30 p-2.5 rounded-xl border border-slate-800 text-left text-[11px] leading-normal">
              <Info className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
              <span>Para acessar como Motorista, o Administrador deve primeiro cadastrá-lo na tela **Motoristas** adicionando o Nome de Usuário e Senha.</span>
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-center">
              <span className="text-slate-400 text-[11px]">Primeira vez testando o sistema?</span>
              <button
                type="button"
                onClick={handleDemoAdmin}
                className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 cursor-pointer font-medium text-[11px]"
              >
                Preencher Administrador de Demonstração (admin / admin)
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
