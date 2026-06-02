-- =============================================================================
-- SQL SCHEMA FOR TRANSROUTE (FLEET MANAGEMENT & TRUCK DRIVER CONTROL)
-- Compatible with PostgreSQL / Supabase
-- =============================================================================

-- Clean up existing tables (Optional - execute with caution)
-- DROP TABLE IF EXISTS frotas_payments CASCADE;
-- DROP TABLE IF EXISTS frotas_work_logs CASCADE;
-- DROP TABLE IF EXISTS frotas_vehicles CASCADE;
-- DROP TABLE IF EXISTS frotas_drivers CASCADE;
-- DROP TABLE IF EXISTS frotas_admins CASCADE;

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. TABELA DE ADMINISTRADORES (frotas_admins)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frotas_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL, -- Armazena a senha de acesso (texto simples ou hash)
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 2. TABELA DE MOTORISTAS / CAMINHONEIROS (frotas_drivers)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frotas_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  cpf TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  license_type TEXT NOT NULL, -- Categoria da CNH (ex: C, D, E)
  license_number TEXT NOT NULL,
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00, -- Valor pago por hora de viagem
  status TEXT NOT NULL DEFAULT 'disponivel' CHECK (status IN ('disponivel', 'em_viagem', 'ferias', 'inativo')),
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL DEFAULT '123456', -- Senha do motorista para acessar o applet
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 3. TABELA DE VEÍCULOS / CAMINHÕES (frotas_vehicles)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frotas_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT UNIQUE NOT NULL, -- Placa do caminhão
  model TEXT NOT NULL,       -- Modelo (ex: FH 540, Constellation)
  brand TEXT NOT NULL,       -- Marca (ex: Volvo, Volkswagen, Scania)
  year INTEGER NOT NULL,
  capacity NUMERIC(10, 2) NOT NULL, -- Capacidade de carga em toneladas
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'manutencao', 'inativo')),
  next_maintenance_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 4. TABELA DE JORNADAS DE TRABALHO / VIAGENS (frotas_work_logs)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frotas_work_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES frotas_drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES frotas_vehicles(id) ON DELETE SET NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE, -- Nulo enquanto a viagem estiver ativa
  total_hours NUMERIC(10, 2) DEFAULT 0.00,
  hourly_rate_applied NUMERIC(10, 2) NOT NULL, -- Valor de taxa horária armazenado na época
  total_earnings NUMERIC(10, 2) DEFAULT 0.00, -- Faturamento calculado (total_hours * hourly_rate_applied)
  trip_description TEXT,
  status TEXT NOT NULL DEFAULT 'pendente_aprovacao' CHECK (status IN ('pendente_aprovacao', 'aprovado', 'pago')),
  approved_by UUID REFERENCES frotas_admins(id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- -----------------------------------------------------------------------------
-- 5. TABELA DE PAGAMENTOS CONCLUÍDOS (frotas_payments)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frotas_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES frotas_drivers(id) ON DELETE CASCADE,
  hours_billed NUMERIC(10, 2) NOT NULL,
  amount_paid NUMERIC(10, 2) NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  notes TEXT,
  payment_method TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'concluido' CHECK (status IN ('concluido')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- =============================================================================
-- PERFORMANCE INDEXES (ÍNDICES DE DESEMPENHO)
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_frotas_drivers_status ON frotas_drivers(status);
CREATE INDEX IF NOT EXISTS idx_frotas_vehicles_status ON frotas_vehicles(status);
CREATE INDEX IF NOT EXISTS idx_frotas_work_logs_driver ON frotas_work_logs(driver_id);
CREATE INDEX IF NOT EXISTS idx_frotas_work_logs_vehicle ON frotas_work_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_frotas_work_logs_status ON frotas_work_logs(status);
CREATE INDEX IF NOT EXISTS idx_frotas_payments_driver ON frotas_payments(driver_id);

-- =============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES FOR SUPABASE
-- =============================================================================
-- Ativar RLS em todas as tabelas
ALTER TABLE frotas_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_work_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE frotas_payments ENABLE ROW LEVEL SECURITY;

-- Como o applet gerencia login client-side de forma simples ou sincronizada,
-- habilita-se políticas irrestritas ou de leitura/escrita aberta para desenvolvimento.
-- Você pode customizar essas regras para maior restrição em produção.
DROP POLICY IF EXISTS "Acesso público irrestrito" ON frotas_admins;
DROP POLICY IF EXISTS "Acesso público irrestrito" ON frotas_drivers;
DROP POLICY IF EXISTS "Acesso público irrestrito" ON frotas_vehicles;
DROP POLICY IF EXISTS "Acesso público irrestrito" ON frotas_work_logs;
DROP POLICY IF EXISTS "Acesso público irrestrito" ON frotas_payments;

CREATE POLICY "Acesso público irrestrito" ON frotas_admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_drivers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_work_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso público irrestrito" ON frotas_payments FOR ALL USING (true) WITH CHECK (true);

-- =============================================================================
-- SEED DATA (DADOS INICIAIS DE TESTE)
-- =============================================================================

-- 1. Inserir Admin de Teste (Usuário: admin | Senha: admin123)
INSERT INTO frotas_admins (id, username, password, name)
VALUES (
  'e68bb892-0b1a-49cb-8fb7-bf6f3c150c0c',
  'admin',
  'admin123',
  'Administrador Principal'
) ON CONFLICT (username) DO NOTHING;

-- 2. Inserir Motoristas de exemplo (Senhas padrão: 123456)
INSERT INTO frotas_drivers (id, name, cpf, phone, license_type, license_number, hourly_rate, status, username, password)
VALUES 
(
  'a29c1e78-bc4a-4e2b-be20-1b203aedc432',
  'Jorge Silva',
  '123.456.789-00',
  '(11) 98765-4321',
  'E',
  '98765432100',
  85.00,
  'disponivel',
  'jorge',
  '123456'
),
(
  'b39d2f89-cd5b-4f3c-bf31-2c314bfe3543',
  'Carlos Souza',
  '234.567.890-11',
  '(21) 97654-3210',
  'D',
  '12345678901',
  75.00,
  'em_viagem',
  'carlos',
  '123456'
) ON CONFLICT (cpf) DO NOTHING;

-- 3. Inserir Veículos de exemplo
INSERT INTO frotas_vehicles (id, plate, model, brand, year, capacity, status)
VALUES
(
  '90bb43ad-1b9f-4f24-9b0d-2a1cb3d9bb22',
  'ABC-1234',
  'FH 540 Globetrotter',
  'Volvo',
  2022,
  45.5,
  'ativo'
),
(
  '80aa329c-2c8e-4e13-8a0c-1a0ba2c8aa11',
  'XYZ-5678',
  'Constellation 24.280',
  'Volkswagen',
  2020,
  23.0,
  'ativo'
),
(
  '70ee123a-3d7f-4f01-7b0a-0c0ab1b7cc00',
  'MNT-9900',
  'R 450 Streamline',
  'Scania',
  2019,
  40.0,
  'manutencao'
) ON CONFLICT (plate) DO NOTHING;
