-- ==============================================================================
-- NETSCOPE POSTGRESQL SCHEMA (SUPABASE MIGRATION)
-- Complete Normalized Schema with RLS, Constraints, Foreign Keys, and Indexes
-- ==============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. Profiles & Users
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'analyst' CHECK (role IN ('analyst', 'administrator', 'viewer')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 2. Networks
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS networks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'Local Network',
    ssid TEXT,
    bssid TEXT,
    gateway_ip INET,
    dns_servers TEXT[] DEFAULT '{}',
    cidr_block CIDR,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 3. Network Interfaces
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS network_interfaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID REFERENCES networks(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., eth0, wlan0, en0
    mac_address MACADDR,
    ip_address INET,
    netmask INET,
    broadcast INET,
    is_up BOOLEAN NOT NULL DEFAULT TRUE,
    is_loopback BOOLEAN NOT NULL DEFAULT FALSE,
    mtu INTEGER,
    speed_mbps INTEGER,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 4. Devices
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    custom_name TEXT,
    hostname TEXT,
    mac_address MACADDR,
    vendor TEXT,
    device_type TEXT DEFAULT 'Unknown', -- Router, Desktop, Mobile, IoT, Server, Printer, Unknown
    os_fingerprint TEXT,
    is_online BOOLEAN NOT NULL DEFAULT TRUE,
    is_authorized BOOLEAN NOT NULL DEFAULT TRUE,
    confidence_level TEXT NOT NULL DEFAULT 'Detected' CHECK (confidence_level IN ('Detected', 'Likely', 'Inferred', 'Unknown')),
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 5. Device Addresses (Historical and multiple IPs/interfaces)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    ip_address INET NOT NULL,
    address_type TEXT NOT NULL DEFAULT 'ipv4' CHECK (address_type IN ('ipv4', 'ipv6')),
    is_primary BOOLEAN NOT NULL DEFAULT TRUE,
    assigned_via TEXT DEFAULT 'DHCP' CHECK (assigned_via IN ('DHCP', 'Static', 'Unknown')),
    first_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 6. Network Services (Ports and Protocols Discovered)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS network_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    port INTEGER NOT NULL CHECK (port >= 1 AND port <= 65535),
    protocol TEXT NOT NULL DEFAULT 'tcp' CHECK (protocol IN ('tcp', 'udp')),
    service_name TEXT, -- e.g., http, ssh, mdns, rtsp
    product_name TEXT,
    version TEXT,
    banner TEXT,
    state TEXT NOT NULL DEFAULT 'open' CHECK (state IN ('open', 'filtered', 'closed')),
    confidence TEXT NOT NULL DEFAULT 'Detected' CHECK (confidence IN ('Detected', 'Likely', 'Inferred', 'Unknown')),
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_verified TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 7. Device Observations (Evidence, Fingerprint traits, Metadata)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    observation_type TEXT NOT NULL, -- e.g., 'oui_lookup', 'ttl_match', 'http_server_header', 'mdns_service'
    raw_evidence TEXT NOT NULL,
    confidence TEXT NOT NULL DEFAULT 'Detected' CHECK (confidence IN ('Detected', 'Likely', 'Inferred', 'Unknown')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 8. Network Snapshots (Network Time Machine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS network_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    total_devices INTEGER NOT NULL DEFAULT 0,
    online_devices INTEGER NOT NULL DEFAULT 0,
    offline_devices INTEGER NOT NULL DEFAULT 0,
    unknown_devices INTEGER NOT NULL DEFAULT 0,
    average_latency_ms NUMERIC(8, 2),
    packet_loss_pct NUMERIC(5, 2) DEFAULT 0.0,
    raw_inventory JSONB NOT NULL DEFAULT '[]'::JSONB,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 9. Device Events (Lifecycle & Security Signals)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_type TEXT NOT NULL CHECK (event_type IN (
        'NEW_DEVICE',
        'DEVICE_DISAPPEARED',
        'DEVICE_RETURNED',
        'IP_CHANGED',
        'MAC_CHANGED',
        'SERVICE_CHANGED',
        'LATENCY_SPIKE',
        'PACKET_LOSS_SPIKE',
        'GATEWAY_CHANGED',
        'DNS_CHANGED',
        'CONNECTIVITY_LOST',
        'CONNECTIVITY_RESTORED'
    )),
    severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::JSONB,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 10. Latency & Packet Loss Telemetry
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS latency_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    target_ip INET NOT NULL,
    rtt_ms NUMERIC(8, 2) NOT NULL,
    sample_type TEXT NOT NULL DEFAULT 'icmp' CHECK (sample_type IN ('icmp', 'tcp', 'dns', 'gateway')),
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS packet_loss_samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    target_ip INET NOT NULL,
    packets_sent INTEGER NOT NULL,
    packets_received INTEGER NOT NULL,
    loss_percent NUMERIC(5, 2) NOT NULL,
    measured_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 11. Diagnostic Results
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS diagnostic_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL CHECK (tool_name IN ('ping', 'dns', 'gateway', 'traceroute', 'subnet', 'connectivity')),
    target TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'warning', 'failure', 'partial')),
    summary TEXT NOT NULL,
    detailed_output JSONB NOT NULL DEFAULT '{}'::JSONB,
    recommendations TEXT[] DEFAULT '{}',
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 12. Security Observations
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE CASCADE,
    severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    category TEXT NOT NULL, -- e.g., 'unencrypted_management', 'default_port', 'unknown_mac_vendor', 'anomaly'
    title TEXT NOT NULL,
    evidence TEXT NOT NULL,
    remediation_steps TEXT NOT NULL,
    is_dismissed BOOLEAN NOT NULL DEFAULT FALSE,
    observed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 13. AI Sessions and Messages
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    network_id UUID REFERENCES networks(id) ON DELETE SET NULL,
    title TEXT NOT NULL DEFAULT 'Network Investigation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES ai_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    facts_cited JSONB DEFAULT '[]'::JSONB,
    inferences JSONB DEFAULT '[]'::JSONB,
    possibilities JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 14. User Settings
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'dark',
    scan_throttle_seconds INTEGER NOT NULL DEFAULT 60,
    monitoring_interval_seconds INTEGER NOT NULL DEFAULT 30,
    enable_cloud_sync BOOLEAN NOT NULL DEFAULT TRUE,
    retention_days INTEGER NOT NULL DEFAULT 30,
    authorized_subnets TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- 15. Reports
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    network_id UUID NOT NULL REFERENCES networks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    format TEXT NOT NULL CHECK (format IN ('json', 'csv', 'pdf')),
    report_data JSONB NOT NULL DEFAULT '{}'::JSONB,
    generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------------------------
-- INDEXES FOR PERFORMANCE
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_networks_user_id ON networks(user_id);
CREATE INDEX IF NOT EXISTS idx_devices_network_id ON devices(network_id);
CREATE INDEX IF NOT EXISTS idx_devices_mac ON devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_devices_is_online ON devices(is_online);
CREATE INDEX IF NOT EXISTS idx_device_addresses_device ON device_addresses(device_id);
CREATE INDEX IF NOT EXISTS idx_device_addresses_ip ON device_addresses(ip_address);
CREATE INDEX IF NOT EXISTS idx_network_services_device ON network_services(device_id);
CREATE INDEX IF NOT EXISTS idx_network_snapshots_network ON network_snapshots(network_id, captured_at DESC);
CREATE INDEX IF NOT EXISTS idx_device_events_network ON device_events(network_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_latency_samples_network ON latency_samples(network_id, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_obs_network ON security_observations(network_id, severity);
CREATE INDEX IF NOT EXISTS idx_ai_messages_session ON ai_messages(session_id, created_at ASC);

-- ------------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE networks ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_interfaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE network_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE latency_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE packet_loss_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Profiles: Users manage their own profile
CREATE POLICY "Users can view and update own profile" ON profiles
    FOR ALL USING (auth.uid() = id);

-- Networks: Users manage networks they own
CREATE POLICY "Users can manage own networks" ON networks
    FOR ALL USING (auth.uid() = user_id);

-- Devices: Accessible through parent network ownership
CREATE POLICY "Users can access devices belonging to their networks" ON devices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = devices.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- Network Interfaces: Accessible through network ownership
CREATE POLICY "Users can access network interfaces" ON network_interfaces
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = network_interfaces.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- Snapshots: Accessible through network ownership
CREATE POLICY "Users can access network snapshots" ON network_snapshots
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = network_snapshots.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- Events: Accessible through network ownership
CREATE POLICY "Users can access device events" ON device_events
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = device_events.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- Diagnostics: Accessible through network ownership
CREATE POLICY "Users can access diagnostic results" ON diagnostic_results
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = diagnostic_results.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- Security Observations: Accessible through network ownership
CREATE POLICY "Users can access security observations" ON security_observations
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM networks
            WHERE networks.id = security_observations.network_id
            AND networks.user_id = auth.uid()
        )
    );

-- AI Sessions: User-scoped
CREATE POLICY "Users can manage own AI sessions" ON ai_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage messages in their AI sessions" ON ai_messages
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM ai_sessions
            WHERE ai_sessions.id = ai_messages.session_id
            AND ai_sessions.user_id = auth.uid()
        )
    );

-- User Settings: User-scoped
CREATE POLICY "Users can manage own settings" ON user_settings
    FOR ALL USING (auth.uid() = user_id);

-- Reports: User-scoped
CREATE POLICY "Users can manage own reports" ON reports
    FOR ALL USING (auth.uid() = user_id);
