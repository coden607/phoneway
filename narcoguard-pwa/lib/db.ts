import { neon } from "@neondatabase/serverless"

function getSQL() {
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL

  if (!connectionString) {
    throw new Error("No server database connection string is configured")
  }
  return neon(connectionString)
}

// ============ USERS ============
// Schema: id, display_name, email, phone, role, avatar_url, is_active, onboarding_completed, created_at, updated_at
export async function createUser(data: {
  email: string
  displayName: string
  phone?: string
  role?: string
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO users (email, display_name, phone, role)
    VALUES (${data.email}, ${data.displayName}, ${data.phone || null}, ${data.role || "user"})
    RETURNING *
  `
  return result[0]
}

export async function getUserByEmail(email: string) {
  const sql = getSQL()
  const result = await sql`SELECT * FROM users WHERE email = ${email}`
  return result[0] || null
}

export async function getUserById(id: number) {
  const sql = getSQL()
  const result = await sql`SELECT * FROM users WHERE id = ${id}`
  return result[0] || null
}

// ============ VITALS ============
// Schema: id, user_id, heart_rate, spo2, respiratory_rate, skin_temperature, blood_pressure_systolic,
//         blood_pressure_diastolic, motion_level, risk_level, recorded_at
export async function recordVitals(data: {
  userId?: number | null
  heartRate: number
  spo2: number
  respiratoryRate: number
  temperature?: number
  riskLevel: string
  overdoseDetected?: boolean
}) {
  const sql = getSQL()
  const motionLevel = data.overdoseDetected ? "critical" : "normal"
  const result = await sql`
    INSERT INTO vitals_readings (user_id, heart_rate, spo2, respiratory_rate, skin_temperature, risk_level, motion_level)
    VALUES (${data.userId || null}, ${data.heartRate}, ${data.spo2}, ${data.respiratoryRate}, ${data.temperature || null}, ${data.riskLevel}, ${motionLevel})
    RETURNING *
  `
  return result[0]
}

export async function getRecentVitals(userId: number, limit = 50) {
  const sql = getSQL()
  return await sql`
    SELECT * FROM vitals_readings 
    WHERE user_id = ${userId} 
    ORDER BY recorded_at DESC 
    LIMIT ${limit}
  `
}

export async function getLatestVitals(userId: number) {
  const sql = getSQL()
  const result = await sql`
    SELECT * FROM vitals_readings 
    WHERE user_id = ${userId} 
    ORDER BY recorded_at DESC 
    LIMIT 1
  `
  return result[0] || null
}

// ============ EMERGENCIES ============
// Schema: id, emergency_id, user_id, latitude, longitude, address, emergency_type, status,
//         vitals_at_trigger, auto_injection_triggered, naloxone_deployed, response_time_seconds,
//         notes, resolved_at, created_at
export async function createEmergency(data: {
  userId?: number | null
  latitude: number
  longitude: number
  emergencyType?: string
  vitalsSnapshot?: object
}) {
  const sql = getSQL()
  const emergencyId = `EMG-${Date.now()}`
  const result = await sql`
    INSERT INTO emergencies (emergency_id, user_id, latitude, longitude, emergency_type, status, vitals_at_trigger)
    VALUES (${emergencyId}, ${data.userId || null}, ${data.latitude}, ${data.longitude}, ${data.emergencyType || "overdose"}, ${"active"}, ${JSON.stringify(data.vitalsSnapshot || {})})
    RETURNING *
  `
  return result[0]
}

export async function updateEmergencyStatus(id: number, status: string, notes?: string) {
  const sql = getSQL()
  const result = await sql`
    UPDATE emergencies 
    SET status = ${status}, 
        notes = ${notes || null},
        resolved_at = ${status === "resolved" ? new Date().toISOString() : null}
    WHERE id = ${id}
    RETURNING *
  `
  return result[0]
}

export async function getActiveEmergencies() {
  const sql = getSQL()
  return await sql`
    SELECT * FROM emergencies 
    WHERE status IN ('active', 'responding') 
    ORDER BY created_at DESC
  `
}

// ============ HEROES ============
// Schema: id, user_id, is_certified, narcan_trained, cpr_trained, carries_naloxone,
//         availability_status, response_radius_miles, total_responses, certification_date,
//         last_active_at, created_at
export async function registerHero(data: {
  userId?: number | null
  narcanTrained?: boolean
  cprTrained?: boolean
  carriesNaloxone?: boolean
  responseRadiusMiles?: number
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO heroes (user_id, narcan_trained, cpr_trained, carries_naloxone, availability_status, response_radius_miles)
    VALUES (${data.userId || null}, ${data.narcanTrained || false}, ${data.cprTrained || false}, ${data.carriesNaloxone || false}, ${"available"}, ${data.responseRadiusMiles || 5})
    RETURNING *
  `
  return result[0]
}

export async function getAvailableHeroes() {
  const sql = getSQL()
  return await sql`
    SELECT h.*, u.display_name, u.phone
    FROM heroes h
    LEFT JOIN users u ON h.user_id = u.id
    WHERE h.availability_status = 'available'
    ORDER BY h.last_active_at DESC NULLS LAST
    LIMIT 20
  `
}

export async function updateHeroStatus(heroId: number, status: string) {
  const sql = getSQL()
  return await sql`
    UPDATE heroes SET availability_status = ${status}, last_active_at = NOW()
    WHERE id = ${heroId}
    RETURNING *
  `
}

// ============ EMERGENCY RESPONSES ============
// Schema: id, emergency_id, hero_id, status, eta_seconds, distance_miles, arrived_at, created_at
export async function createEmergencyResponse(data: {
  emergencyId: number
  heroId: number
  etaSeconds?: number
  distanceMiles?: number
  status?: "dispatched" | "en_route" | "on_scene" | "completed" | "cancelled"
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO emergency_responses (emergency_id, hero_id, status, eta_seconds, distance_miles)
    VALUES (${data.emergencyId}, ${data.heroId}, ${data.status || "dispatched"}, ${data.etaSeconds || null}, ${data.distanceMiles || null})
    RETURNING *
  `
  return result[0]
}

// ============ LOCATIONS ============
// Schema: id, user_id, latitude, longitude, accuracy, altitude, speed, heading, recorded_at
export async function updateUserLocation(data: {
  userId?: number | null
  latitude: number
  longitude: number
  accuracy?: number
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO locations (user_id, latitude, longitude, accuracy)
    VALUES (${data.userId || null}, ${data.latitude}, ${data.longitude}, ${data.accuracy || null})
    RETURNING *
  `
  return result[0]
}

// ============ WATCHES ============
// Schema: id, user_id, serial_number, firmware_version, battery_level, is_connected,
//         naloxone_cartridge_status, naloxone_expiry_date, last_sync_at, created_at
export async function registerWatch(data: {
  userId?: number | null
  serialNumber: string
  firmwareVersion?: string
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO watches (user_id, serial_number, firmware_version, naloxone_cartridge_status)
    VALUES (${data.userId || null}, ${data.serialNumber}, ${data.firmwareVersion || "1.0.0"}, ${"loaded"})
    RETURNING *
  `
  return result[0]
}

export async function getWatchBySerial(serial: string) {
  const sql = getSQL()
  const result = await sql`SELECT * FROM watches WHERE serial_number = ${serial}`
  return result[0] || null
}

// ============ DONATIONS ============
// Schema: id, donor_name, donor_email, amount, source, message, is_anonymous, created_at
export async function recordDonation(data: {
  donorName?: string
  donorEmail?: string
  amount: number
  source?: string
  message?: string
  isAnonymous?: boolean
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO donations (donor_name, donor_email, amount, source, message, is_anonymous)
    VALUES (${data.donorName || "Anonymous"}, ${data.donorEmail || null}, ${data.amount}, ${data.source || "gofundme"}, ${data.message || null}, ${data.isAnonymous || false})
    RETURNING *
  `
  return result[0]
}

export async function getDonationStats() {
  const sql = getSQL()
  const result = await sql`
    SELECT 
      COUNT(*) as total_donations,
      COALESCE(SUM(amount), 0) as total_raised,
      COALESCE(AVG(amount), 0) as avg_donation
    FROM donations
  `
  return result[0]
}

// ============ ACTIVITY LOG ============
// Schema: id, user_id, action, details, ip_address, created_at
export async function logActivity(data: {
  userId?: number | null
  action: string
  details?: object
  ipAddress?: string
}) {
  const sql = getSQL()
  return await sql`
    INSERT INTO activity_log (user_id, action, details, ip_address)
    VALUES (${data.userId || null}, ${data.action}, ${JSON.stringify(data.details || {})}, ${data.ipAddress || null})
  `
}

// ============ LEGAL AGREEMENTS ============
// Schema: id, user_id, agreement_type, ip_address, agreed_at
export async function recordAgreement(data: {
  userId?: number | null
  agreementType: string
  ipAddress?: string
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO legal_agreements (user_id, agreement_type, ip_address)
    VALUES (${data.userId || null}, ${data.agreementType}, ${data.ipAddress || null})
    RETURNING *
  `
  return result[0]
}

// ============ EMERGENCY CONTACTS ============
// Schema: id, user_id, name, phone, relationship, is_primary, created_at
export async function addEmergencyContact(data: {
  userId: number
  name: string
  phone: string
  relationship?: string
  isPrimary?: boolean
}) {
  const sql = getSQL()
  const result = await sql`
    INSERT INTO emergency_contacts (user_id, name, phone, relationship, is_primary)
    VALUES (${data.userId}, ${data.name}, ${data.phone}, ${data.relationship || null}, ${data.isPrimary || false})
    RETURNING *
  `
  return result[0]
}

export async function getEmergencyContacts(userId: number) {
  const sql = getSQL()
  return await sql`
    SELECT * FROM emergency_contacts WHERE user_id = ${userId} ORDER BY is_primary DESC
  `
}

// ============ DASHBOARD STATS ============
export async function getDashboardStats() {
  const sql = getSQL()
  const [users, heroes, emergencies, donations] = await Promise.all([
    sql`SELECT COUNT(*) as count FROM users`,
    sql`SELECT COUNT(*) as count FROM heroes WHERE availability_status = 'available'`,
    sql`SELECT COUNT(*) as count FROM emergencies`,
    sql`SELECT COALESCE(SUM(amount), 0) as total FROM donations`,
  ])
  return {
    totalUsers: Number(users[0]?.count || 0),
    activeHeroes: Number(heroes[0]?.count || 0),
    totalEmergencies: Number(emergencies[0]?.count || 0),
    totalDonations: Number(donations[0]?.total || 0),
  }
}
