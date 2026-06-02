/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Driver {
  id: string;
  name: string;
  cpf: string;
  phone: string;
  licenseType: string; // CNH: C, D, E, etc.
  licenseNumber: string;
  hourlyRate: number; // Pagamento por hora
  status: 'disponivel' | 'em_viagem' | 'ferias' | 'inativo';
  username: string;
  password?: string; // Senha para acesso
  createdAt: string;
}

export interface Vehicle {
  id: string;
  plate: string; // Placa
  model: string; // Modelo
  brand: string; // Marca
  year: number;
  capacity: number; // Capacidade em toneladas
  status: 'ativo' | 'manutencao' | 'inativo';
  nextMaintenanceDate?: string;
  createdAt: string;
}

export interface WorkLog {
  id: string;
  driverId: string;
  driverName?: string; // Cache para relatórios locais
  vehicleId: string;
  vehiclePlate?: string; // Cache
  startTime: string; // ISO String
  endTime: string | null; // ISO String ou null se ativo
  totalHours: number; // Calculado
  hourlyRateApplied: number; // Taxa horária no momento do log
  totalEarnings: number; //totalHours * hourlyRateApplied
  tripDescription: string;
  status: 'pendente_aprovacao' | 'aprovado' | 'pago';
  approvedBy?: string | null;
  approvedAt?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  driverId: string;
  driverName?: string;
  hoursBilled: number;
  amountPaid: number;
  paymentDate: string; // ISO String
  periodStart: string;
  periodEnd: string;
  notes?: string;
  paymentMethod: string;
  status: 'concluido';
  createdAt: string;
}

export interface LoggedUser {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'driver';
  driverId: string | null; // Se for motorista, vincula ao motorista correspondente
}
