/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  Database, Check, Copy, Terminal, Link, AlertTriangle, Play,
  Settings, CheckCircle, Info, RefreshCw, Trash2 
} from 'lucide-react';
import { isSupabaseConfigured } from '../supabaseClient';
import { SUPABASE_DDL } from '../storage';

export default function SupabaseHelper() {
  const [copied, setCopied] = useState(false);

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_DDL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearLocalDatabase = () => {
    if (!window.confirm('Tem certeza que deseja apagar os registros do LocalStorage? Isso reiniciará o banco local para testar do zero.')) {
      return;
    }
    // Remove local keys
    localStorage.removeItem('fleet_admins');
    localStorage.removeItem('fleet_drivers');
    localStorage.removeItem('fleet_vehicles');
    localStorage.removeItem('fleet_work_logs');
    localStorage.removeItem('fleet_payments');
    
    alert('Banco de dados de simulação local limpo. A página será atualizada.');
    window.location.reload();
  };

  return (
    <div className="space-y-6" id="supabase-helper-root">
      
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold font-sans text-white flex items-center gap-2">
          <Database className="h-5.5 w-5.5 text-blue-400" />
          Conectividade com Banco de Dados (Supabase)
        </h2>
        <p className="text-slate-400 text-xs mt-1">
          Acompanhe o status da conexão em nuvem e encontre as instruções para ligar sua conta do Supabase.
        </p>
      </div>

      {/* Indicador de Status */}
      <div className={`p-5 rounded-2xl border ${
        isSupabaseConfigured 
          ? 'bg-emerald-950/20 border-emerald-550/30 text-emerald-100' 
          : 'bg-amber-950/20 border-amber-550/30 text-amber-100'
      }`} id="conn-status-banner">
        <div className="flex items-start gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${
            isSupabaseConfigured ? 'bg-emerald-500/10 text-emerald-400 font-bold' : 'bg-amber-500/10 text-amber-400 font-bold'
          }`}>
            <Database className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></span>
              <span>{isSupabaseConfigured ? 'Supabase Conectado com Sucesso! 🟢' : 'Modo de Contingência: Armazenamento Local Ativo 🟡'}</span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {isSupabaseConfigured 
                ? 'Seu aplicativo está lendo e escrevendo informações na nuvem do Supabase em tempo real! Toda criação de motoristas, horas e faturamentos está sincronizada.' 
                : 'O sistema continua funcionando 100% gravando no LocalStorage do seu navegador! Isso permite preencher e visualizar os Relatórios/Dashboard imediatamente. Assim que definir suas chaves, a persistência migrará automaticamente.'}
            </p>
          </div>
        </div>
      </div>

      {/* SQL Script e Instrução */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="helper-columns">
        
        {/* Passos */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 lg:col-span-4 space-y-4" id="supabase-tutorial">
          <h3 className="text-sm font-semibold text-white font-sans border-b border-slate-750 pb-2">
            Como ligar seu Supabase
          </h3>
          
          <ol className="space-y-4 text-xs text-slate-350 list-none" id="tutorial-list">
            <li className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">1</span>
              <div>
                <strong className="block font-bold text-white mb-0.5">Criar Projeto Grátis</strong>
                <span>Acesse <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">supabase.com</a> e monte um projeto Postgres em 1 minuto.</span>
              </div>
            </li>

            <li className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">2</span>
              <div>
                <strong className="block font-bold text-white mb-0.5">Configurar Chaves API</strong>
                <span>Clique em **Configurações &gt; API**. Copie a `Project URL` e a `anon/public API Key`.</span>
              </div>
            </li>

            <li className="flex gap-2.5 items-start">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-600/20 text-blue-400 font-mono text-[10px] font-bold shrink-0 mt-0.5">3</span>
              <div>
                <strong className="block font-bold text-white mb-0.5">Adicionar Segredos</strong>
                <span>Cole essas duas chaves nas variáveis `@env` ou no painel de Segredos (VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY).</span>
              </div>
            </li>

            <li className="flex gap-2.5 items-start text-xs rounded-xl bg-slate-900/40 p-3.5 border border-slate-750">
              <Info className="h-4 w-4 shrink-0 text-blue-400 mt-0.5" />
              <span>Para limpar toda simulação local e testar do zero a persistência do navegador, clique abaixo.</span>
            </li>
          </ol>

          <button
            onClick={clearLocalDatabase}
            className="w-full py-2 bg-red-950/40 border border-red-800/55 hover:bg-red-900/30 text-red-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Apagar Banco de Dados Local
          </button>
        </div>

        {/* SQL Script CodeBox */}
        <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-5 md:p-6 lg:col-span-8 flex flex-col justify-between" id="supabase-sql-box">
          <div>
            <div className="flex items-center justify-between border-b border-slate-750 pb-2 mb-4">
              <div className="flex items-center gap-1.5">
                <Terminal className="h-4 w-4 text-slate-450" />
                <h3 className="text-sm font-semibold text-white font-sans">
                  Script de Tabelas SQL (DDL)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCopySchema}
                className="px-2.5 py-1 text-[10px] font-semibold text-slate-300 hover:text-white bg-slate-700 hover:bg-slate-650 rounded border border-slate-650 flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copiado!' : 'Copiar Script'}</span>
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Abra a aba **SQL Editor** do seu console do Supabase, clique em **New Query**, cole o código abaixo e execute (**Run**) para criar as tabelas estruturadas do gerenciador automaticamente.
            </p>

            <div className="bg-slate-900 border border-slate-750 rounded-xl p-3.5 overflow-x-auto max-h-[300px]" id="sql-block">
              <pre className="text-[10px] font-mono text-slate-300 leading-normal select-all">
                {SUPABASE_DDL}
              </pre>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
