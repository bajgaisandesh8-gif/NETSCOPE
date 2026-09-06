export type ConfidenceLevel = 'Detected' | 'Likely' | 'Inferred' | 'Unknown' | 'Unavailable';

export interface NetworkInterface {
  name: string;
  is_up: boolean;
  is_loopback: boolean;
  mac_address: string | null;
  mac_confidence: ConfidenceLevel;
  mtu: number | null;
  ipv4: string | null;
  ipv4_confidence: ConfidenceLevel;
  prefix_len: number | null;
  netmask: string | null;
  cidr: string | null;
  ipv6: string | null;
}

export interface NetworkGateway {
  ip: string | null;
  interface: string | null;
  confidence: ConfidenceLevel;
  method: string;
  note?: string;
}

export interface DnsServer {
  ip: string;
  confidence: ConfidenceLevel;
  source: string;
}

export interface PingProbeResult {
  target: string;
  reachable: boolean;
  confidence: ConfidenceLevel;
  avg_rtt_ms: number | null;
  packet_loss_pct: number;
  error?: string;
  raw_output?: string;
}

export interface NmapStatus {
  available: boolean;
  confidence: ConfidenceLevel;
  path: string | null;
  version: string | null;
  message: string;
}

export interface NetworkBaseline {
  primary_interface: NetworkInterface | null;
  all_interfaces: NetworkInterface[];
  gateway: NetworkGateway;
  gateway_probe: PingProbeResult | null;
  dns_servers: DnsServer[];
  dns_probe: PingProbeResult | null;
  nmap: NmapStatus;
  is_offline_capable: boolean;
}

export interface SubsystemStatus {
  status: 'online' | 'offline' | 'offline_local' | 'ready';
  message: string;
  [key: string]: unknown;
}

export interface SystemStatus {
  local_network_engine: SubsystemStatus & {
    active_interfaces: number;
    nmap_available: boolean;
    offline_mode_capable: boolean;
  };
  supabase: SubsystemStatus & {
    mode: 'cloud' | 'offline_local';
    provider: string;
  };
  ai_service: SubsystemStatus & {
    configured: boolean;
    provider: string;
  };
}

export interface FirstRunInfo {
  ready_for_discovery: boolean;
  network_baseline: NetworkBaseline;
  permissions_explanation: {
    scope: string;
    actions_authorized: string[];
    forbidden_actions: string[];
  };
}

export type NavigationTab =
  | 'overview'
  | 'devices'
  | '3d-network'
  | 'health'
  | 'events'
  | 'history'
  | 'diagnostics'
  | 'security'
  | 'analytics'
  | 'ai'
  | 'reports'
  | 'settings';

export interface DeviceService {
  port: number;
  protocol: string;
  service: string;
  state: string;
  confidence: ConfidenceLevel;
}

export interface Device {
  id: string;
  ip: string;
  mac_address: string | null;
  mac_confidence: ConfidenceLevel;
  vendor: string | null;
  vendor_confidence: ConfidenceLevel;
  hostname: string | null;
  hostname_confidence: ConfidenceLevel;
  device_type: string;
  type_confidence: ConfidenceLevel;
  is_gateway: boolean;
  is_online: boolean;
  first_seen: string;
  last_seen: string;
  observation_count: number;
  services: DeviceService[];
  nickname?: string;
}

export interface NetworkEvent {
  id: string;
  timestamp: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  details: Record<string, any>;
}

export interface SecurityFinding {
  id: string;
  title: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  confidence: ConfidenceLevel;
  evidence: string;
  impact: string;
}

export interface SecurityRecommendation {
  id: string;
  title: string;
  priority: 'Low' | 'Medium' | 'High';
  action: string;
}

export interface SecurityPosture {
  score: number;
  rating: string;
  total_devices_audited: number;
  risky_services_count: number;
  unknown_mac_count: number;
  findings: SecurityFinding[];
  recommendations: SecurityRecommendation[];
  analyzed_at: string;
}

export interface LatencySample {
  timestamp: string;
  target: string;
  rtt_ms: number | null;
  packet_loss_pct: number;
}

export interface HealthMetrics {
  sample_count: number;
  current_rtt_ms: number | null;
  avg_rtt_ms: number;
  min_rtt_ms: number;
  max_rtt_ms: number;
  jitter_ms: number;
  avg_packet_loss_pct: number;
  history: LatencySample[];
}

export interface Snapshot {
  id: string;
  label: string;
  timestamp: string;
  device_count: number;
  devices: Device[];
  primary_ip?: string;
  gateway_ip?: string;
}

