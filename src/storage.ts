/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Driver, Vehicle, WorkLog, Payment, LoggedUser } from './types';

// Helper de logs para o console para instruir o desenvolvedor
const logStorageInfo = (msg: string, details?: any) => {
  console.log(`[FleetManager Storage] ${msg}`, details || '');
};

// SQL Schema de criação para o Supabase (DDL)
export const SUPABASE_DDL = `-- Executar no SQL Editor do seu Supabase para criar as tabelas necessárias:

-- 1. Tabela de Administradores
CREATE TABLE IF NOT EXISTS frotas_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Motoristas (Caminhoneiros)
CREATE TABLE IF NOT EXISTS frotas_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  license_type TEXT NOT NULL, -- CNH Category C, D, E
  license_number TEXT NOT NULL,
  hourly_rate NUMERIC NOT NULL DEFAULT 0.0,
  status TEXT NOT NULL CHECK (status IN ('disponivel', 'em_viagem', 'ferias', 'inativo')),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Veículos (Caminhões)
CREATE TABLE IF NOT EXISTS frotas_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT UNIQUE NOT NULL, -- Placa
  model TEXT NOT NULL,
  brand TEXT NOT NULL,
  year INTEGER NOT NULL,
  capacity NUMERIC NOT NULL, -- Capacidade em toneladas
  status TEXT NOT NULL CHECK (status IN ('ativo', 'manutencao', 'inativo')),
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Jornadas de Trabalho (WorkLogs)
CREATE TABLE IF NOT EXISTS frotas_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES frotas_drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES frotas_vehicles(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  total_hours NUMERIC DEFAULT 0.0,
  hourly_rate_applied NUMERIC NOT NULL,
  total_earnings NUMERIC DEFAULT 0.0,
  trip_description TEXT,
  status TEXT NOT NULL CHECK (status IN ('pendente_aprovacao', 'aprovado', 'pago')),
  approved_by UUID REFERENCES frotas_admins(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Pagamentos Efetuados
CREATE TABLE IF NOT EXISTS frotas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES frotas_drivers(id) ON DELETE CASCADE,
  hours_billed NUMERIC NOT NULL,
  amount_paid NUMERIC NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('concluido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Políticas de RLS simples (Desativar RLS ou permitir acesso público para simplicidade)
ALTER TABLE frotas_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_payments ENABLE ROW LEVEL SECURITY;

-- Exemplo de política de acesso público irrestrito para desenvolvimento:
CREATE POLICY "Acesso público irrestrito" ON frotas_admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_work_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_payments FOR ALL USING (true) WITH CHECK (true);
`;

// Carrega dados locais caso Supabase não esteja ativo ou ocorra um erro
const getLocal = <T>(key: string): T[] => {
  const data = localStorage.getItem(`fleet_${key}`);
  return data ? JSON.parse(data) : [];
};

const saveLocal = <T>(key: string, data: T[]) => {
  localStorage.setItem(`fleet_${key}`, JSON.stringify(data));
};

export const fleetStorage = {
  // --- SEGURANÇA E AUTHENTICAÇÃO ---
  async getAdmins(): Promise<any[]> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Obtendo admins do Supabase');
      const { data, error } = await supabase.from('frotas_admins').select('*');
      if (!error && data) return data;
      logStorageInfo('Erro ao buscar admins no Supabase, usando LocalStorage', error);
    }
    return getLocal('admins');
  },

  async createAdmin(admin: any): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Criando admin no Supabase', admin.username);
      const { error } = await supabase.from('frotas_admins').insert([{
        username: admin.username,
        password: admin.password,
        name: admin.name
      }]);
      if (!error) return;
      logStorageInfo('Erro ao inserir admin no Supabase, jogando para LocalStorage', error);
    }
    const list = getLocal<any>('admins');
    list.push({ ...admin, id: admin.id || crypto.randomUUID(), createdAt: new Date().toISOString() });
    saveLocal('admins', list);
  },

  // --- MOTORISTAS ---
  async getDrivers(): Promise<Driver[]> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Obtendo motoristas do Supabase');
      const { data, error } = await supabase.from('frotas_drivers').select('*');
      if (!error && data) {
        // Map snake_case database back to camelCase
        return data.map((d: any) => ({
          id: d.id,
          name: d.name,
          cpf: d.cpf,
          phone: d.phone,
          licenseType: d.license_type,
          licenseNumber: d.license_number,
          hourlyRate: Number(d.hourly_rate),
          status: d.status,
          username: d.username,
          password: d.password,
          createdAt: d.created_at
        }));
      }
      logStorageInfo('Erro ao buscar motoristas no Supabase, usando LocalStorage', error);
    }
    return getLocal<Driver>('drivers');
  },

  async saveDriver(driver: Driver): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Salvando motorista no Supabase', driver.name);
      
      const payload: any = {
        name: driver.name,
        cpf: driver.cpf,
        phone: driver.phone,
        license_type: driver.licenseType,
        license_number: driver.licenseNumber,
        hourly_rate: driver.hourlyRate,
        status: driver.status,
        username: driver.username
      };

      // Se a senha foi informada, salvamos
      if (driver.password) {
        payload.password = driver.password;
      }

      // Verifica se o motorista já existe no Supabase por CPF ou ID
      const { data: exist } = await supabase.from('frotas_drivers').select('id').eq('id', driver.id).maybeSingle();

      let query;
      if (exist) {
        query = supabase.from('frotas_drivers').update(payload).eq('id', driver.id);
      } else {
        payload.id = driver.id || undefined;
        payload.password = driver.password || '123456'; // Padrão se ausente
        query = supabase.from('frotas_drivers').insert([payload]);
      }
      
      const { error } = await query;
      if (!error) return;
      logStorageInfo('Erro ao salvar motorista no Supabase, usando LocalStorage', error);
    }

    // Fallback Local
    const drivers = getLocal<Driver>('drivers');
    const index = drivers.findIndex(d => d.id === driver.id);
    const updatedDriver = { ...driver };
    
    // Garantir que não removemos a senha se ela já existir e não estiver sendo atualizada
    if (index >= 0 && !driver.password) {
      updatedDriver.password = drivers[index].password;
    }
    if (!updatedDriver.password) {
      updatedDriver.password = '123456'; // Padrão
    }

    if (index >= 0) {
      drivers[index] = updatedDriver;
    } else {
      drivers.push(updatedDriver);
    }
    saveLocal('drivers', drivers);
  },

  async deleteDriver(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo(`Deletando motorista ${id} do Supabase`);
      const { error } = await supabase.from('frotas_drivers').delete().eq('id', id);
      if (!error) return;
      logStorageInfo('Erro ao deletar motorista no Supabase (LocalStorage utilizado)', error);
    }
    const drivers = getLocal<Driver>('drivers');
    saveLocal('drivers', drivers.filter(d => d.id !== id));
  },

  // --- VEÍCULOS (FROTA) ---
  async getVehicles(): Promise<Vehicle[]> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Obtendo veículos do Supabase');
      const { data, error } = await supabase.from('frotas_vehicles').select('*');
      if (!error && data) {
        return data.map((v: any) => ({
          id: v.id,
          plate: v.plate,
          model: v.model,
          brand: v.brand,
          year: v.year,
          capacity: Number(v.capacity),
          status: v.status,
          nextMaintenanceDate: v.next_maintenance_date,
          createdAt: v.created_at
        }));
      }
      logStorageInfo('Erro ao buscar veículos no Supabase, usando LocalStorage', error);
    }
    return getLocal<Vehicle>('vehicles');
  },

  async saveVehicle(vehicle: Vehicle): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Salvando veículo no Supabase', vehicle.plate);
      const payload = {
        plate: vehicle.plate,
        model: vehicle.model,
        brand: vehicle.brand,
        year: vehicle.year,
        capacity: vehicle.capacity,
        status: vehicle.status,
        next_maintenance_date: vehicle.nextMaintenanceDate || null
      };

      const { data: exist } = await supabase.from('frotas_vehicles').select('id').eq('id', vehicle.id).maybeSingle();

      let query;
      if (exist) {
        query = supabase.from('frotas_vehicles').update(payload).eq('id', vehicle.id);
      } else {
        const payloadWithId = { ...payload, id: vehicle.id || undefined };
        query = supabase.from('frotas_vehicles').insert([payloadWithId]);
      }

      const { error } = await query;
      if (!error) return;
      logStorageInfo('Erro ao salvar veículo no Supabase, usando LocalStorage', error);
    }

    const list = getLocal<Vehicle>('vehicles');
    const index = list.findIndex(v => v.id === vehicle.id);
    if (index >= 0) {
      list[index] = vehicle;
    } else {
      list.push(vehicle);
    }
    saveLocal('vehicles', list);
  },

  async deleteVehicle(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo(`Deletando veículo ${id} do Supabase`);
      const { error } = await supabase.from('frotas_vehicles').delete().eq('id', id);
      if (!error) return;
      logStorageInfo('Erro ao deletar veículo no Supabase (LocalStorage utilizado)', error);
    }
    const list = getLocal<Vehicle>('vehicles');
    saveLocal('vehicles', list.filter(v => v.id !== id));
  },

  // --- JORNADA DE TRABALHO (WORKLOGS) ---
  async getWorkLogs(): Promise<WorkLog[]> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Obtendo jornadas de trabalho do Supabase');
      // Busca WorkLogs e faz o join simples se possível, ou puxa os dados e faz o lookup local
      const { data, error } = await supabase.from('frotas_work_logs').select(`
        *,
        frotas_drivers (name),
        frotas_vehicles (plate)
      `);
      if (!error && data) {
        return data.map((wl: any) => ({
          id: wl.id,
          driverId: wl.driver_id,
          driverName: wl.frotas_drivers?.name,
          vehicleId: wl.vehicle_id,
          vehiclePlate: wl.frotas_vehicles?.plate,
          startTime: wl.start_time,
          endTime: wl.end_time,
          totalHours: Number(wl.total_hours || 0),
          hourlyRateApplied: Number(wl.hourly_rate_applied || 0),
          totalEarnings: Number(wl.total_earnings || 0),
          tripDescription: wl.trip_description,
          status: wl.status,
          approvedBy: wl.approved_by,
          approvedAt: wl.approved_at,
          createdAt: wl.created_at
        }));
      }
      logStorageInfo('Erro ao buscar jornadas de trabalho no Supabase, usando LocalStorage', error);
    }
    return getLocal<WorkLog>('work_logs');
  },

  async saveWorkLog(wl: WorkLog): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Salvando jornada de trabalho no Supabase', wl.id);
      const payload = {
        driver_id: wl.driverId,
        vehicle_id: wl.vehicleId || null,
        start_time: wl.startTime,
        end_time: wl.endTime,
        total_hours: wl.totalHours,
        hourly_rate_applied: wl.hourlyRateApplied,
        total_earnings: wl.totalEarnings,
        trip_description: wl.tripDescription,
        status: wl.status,
        approved_by: wl.approvedBy || null,
        approved_at: wl.approvedAt || null
      };

      const { data: exist } = await supabase.from('frotas_work_logs').select('id').eq('id', wl.id).maybeSingle();

      let query;
      if (exist) {
        query = supabase.from('frotas_work_logs').update(payload).eq('id', wl.id);
      } else {
        const payloadWithId = { ...payload, id: wl.id || undefined };
        query = supabase.from('frotas_work_logs').insert([payloadWithId]);
      }

      const { error } = await query;
      if (!error) return;
      logStorageInfo('Erro ao salvar jornada no Supabase (LocalStorage utilizado)', error);
    }

    const list = getLocal<WorkLog>('work_logs');
    const index = list.findIndex(item => item.id === wl.id);
    if (index >= 0) {
      list[index] = wl;
    } else {
      list.push(wl);
    }
    saveLocal('work_logs', list);
  },

  async deleteWorkLog(id: string): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo(`Deletando jornada ${id} do Supabase`);
      const { error } = await supabase.from('frotas_work_logs').delete().eq('id', id);
      if (!error) return;
      logStorageInfo('Erro ao deletar jornada no Supabase (LocalStorage utilizado)', error);
    }
    const list = getLocal<WorkLog>('work_logs');
    saveLocal('work_logs', list.filter(wl => wl.id !== id));
  },

  // --- PAGAMENTOS ---
  async getPayments(): Promise<Payment[]> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Obtendo pagamentos do Supabase');
      const { data, error } = await supabase.from('frotas_payments').select(`
        *,
        frotas_drivers (name)
      `);
      if (!error && data) {
        return data.map((p: any) => ({
          id: p.id,
          driverId: p.driver_id,
          driverName: p.frotas_drivers?.name,
          hoursBilled: Number(p.hours_billed),
          amountPaid: Number(p.amount_paid),
          paymentDate: p.payment_date,
          periodStart: p.period_start,
          periodEnd: p.period_end,
          notes: p.notes,
          paymentMethod: p.payment_method,
          status: p.status,
          createdAt: p.created_at
        }));
      }
      logStorageInfo('Erro ao buscar pagamentos no Supabase, usando LocalStorage', error);
    }
    return getLocal<Payment>('payments');
  },

  async savePayment(payment: Payment): Promise<void> {
    if (isSupabaseConfigured && supabase) {
      logStorageInfo('Salvando pagamento no Supabase', payment.driverId);
      const payload = {
        driver_id: payment.driverId,
        hours_billed: payment.hoursBilled,
        amount_paid: payment.amountPaid,
        payment_date: payment.paymentDate,
        period_start: payment.periodStart,
        period_end: payment.periodEnd,
        notes: payment.notes || null,
        payment_method: payment.paymentMethod,
        status: payment.status
      };

      const { data: exist } = await supabase.from('frotas_payments').select('id').eq('id', payment.id).maybeSingle();

      let query;
      if (exist) {
        query = supabase.from('frotas_payments').update(payload).eq('id', payment.id);
      } else {
        const payloadWithId = { ...payload, id: payment.id || undefined };
        query = supabase.from('frotas_payments').insert([payloadWithId]);
      }

      const { error } = await query;
      if (!error) return;
      logStorageInfo('Erro ao salvar pagamento no Supabase (LocalStorage utilizado)', error);
    }

    const list = getLocal<Payment>('payments');
    const index = list.findIndex(p => p.id === payment.id);
    if (index >= 0) {
      list[index] = payment;
    } else {
      list.push(payment);
    }
    saveLocal('payments', list);
  }
};
