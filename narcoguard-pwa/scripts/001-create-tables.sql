-- NarcoGuard PWA Database Schema
-- Complete backend for overdose prevention system

-- Users table: stores all app users (both regular users and heroes)
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  display_name VARCHAR(255),
  phone VARCHAR(20),
  role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'hero', 'admin')),
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency contacts for each user
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  relationship VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hero network registrations
CREATE TABLE IF NOT EXISTS heroes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  is_certified BOOLEAN DEFAULT false,
  certification_date TIMESTAMP WITH TIME ZONE,
  narcan_trained BOOLEAN DEFAULT false,
  cpr_trained BOOLEAN DEFAULT false,
  carries_naloxone BOOLEAN DEFAULT false,
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN ('available', 'busy', 'offline')),
  response_radius_miles DECIMAL(4,1) DEFAULT 1.0,
  total_responses INTEGER DEFAULT 0,
  last_active_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vitals readings from the NG watch
CREATE TABLE IF NOT EXISTS vitals_readings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  heart_rate INTEGER,
  spo2 DECIMAL(5,2),
  respiratory_rate INTEGER,
  skin_temperature DECIMAL(4,1),
  blood_pressure_systolic INTEGER,
  blood_pressure_diastolic INTEGER,
  motion_level VARCHAR(20),
  risk_level VARCHAR(20) DEFAULT 'normal' CHECK (risk_level IN ('normal', 'elevated', 'warning', 'critical')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency events
CREATE TABLE IF NOT EXISTS emergencies (
  id SERIAL PRIMARY KEY,
  emergency_id VARCHAR(50) UNIQUE NOT NULL,
  user_id INTEGER REFERENCES users(id),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  address TEXT,
  emergency_type VARCHAR(50) DEFAULT 'overdose',
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'responding', 'resolved', 'false_alarm', 'cancelled')),
  naloxone_deployed BOOLEAN DEFAULT false,
  auto_injection_triggered BOOLEAN DEFAULT false,
  vitals_at_trigger JSONB,
  response_time_seconds INTEGER,
  resolved_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hero responses to emergencies
CREATE TABLE IF NOT EXISTS emergency_responses (
  id SERIAL PRIMARY KEY,
  emergency_id INTEGER REFERENCES emergencies(id) ON DELETE CASCADE,
  hero_id INTEGER REFERENCES heroes(id),
  status VARCHAR(20) DEFAULT 'dispatched' CHECK (status IN ('dispatched', 'en_route', 'on_scene', 'completed', 'cancelled')),
  distance_miles DECIMAL(5,2),
  eta_seconds INTEGER,
  arrived_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Location tracking for users and heroes
CREATE TABLE IF NOT EXISTS locations (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  accuracy DECIMAL(8, 2),
  altitude DECIMAL(8, 2),
  speed DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- NG Watch devices
CREATE TABLE IF NOT EXISTS watches (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  serial_number VARCHAR(50) UNIQUE NOT NULL,
  firmware_version VARCHAR(20),
  battery_level INTEGER DEFAULT 100,
  naloxone_cartridge_status VARCHAR(20) DEFAULT 'loaded' CHECK (naloxone_cartridge_status IN ('loaded', 'deployed', 'expired', 'empty')),
  naloxone_expiry_date DATE,
  is_connected BOOLEAN DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Donations and funding tracker
CREATE TABLE IF NOT EXISTS donations (
  id SERIAL PRIMARY KEY,
  donor_name VARCHAR(255),
  donor_email VARCHAR(255),
  amount DECIMAL(10, 2) NOT NULL,
  source VARCHAR(50) DEFAULT 'gofundme',
  message TEXT,
  is_anonymous BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity feed
CREATE TABLE IF NOT EXISTS activity_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  details JSONB,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Good Samaritan law acknowledgments
CREATE TABLE IF NOT EXISTS legal_agreements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  agreement_type VARCHAR(50) NOT NULL,
  agreed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address INET
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_vitals_user_time ON vitals_readings(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_emergencies_status ON emergencies(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_locations_user_time ON locations(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_heroes_availability ON heroes(availability_status, last_active_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_watches_user ON watches(user_id);
CREATE INDEX IF NOT EXISTS idx_emergency_responses_emergency ON emergency_responses(emergency_id);
