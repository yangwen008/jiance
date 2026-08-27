// ==================== 环境变量与绑定 ====================

export interface Env {
  // Bindings
  DB: D1Database;
  R2: R2Bucket;
  VECTORIZE: VectorizeIndex;

  // 环境变量
  JWT_SECRET: string;
  GEMINI_API_KEY: string;
  SMS_ACCESS_KEY_ID: string;
  SMS_ACCESS_KEY_SECRET: string;
  SMS_SIGN_NAME: string;
  SMS_TEMPLATE_CODE: string;
  CORS_ORIGIN: string;
}

// ==================== 用户相关 ====================

export interface User {
  id: string;
  phone: string;
  name: string | null;
  role: 'admin' | 'manager' | 'user';
  avatar: string | null;
  status: 'active' | 'disabled';
  created_at: string;
  updated_at: string;
}

export interface JwtPayload {
  sub: string;      // user id
  phone: string;
  role: string;
  iat: number;
  exp: number;
}

// ==================== 设备相关 ====================

export type DeviceType = 'weather' | 'camera' | 'pest_monitor' | 'multispectral';
export type DeviceStatus = 'online' | 'offline' | 'alarm' | 'maintenance';

export interface Device {
  id: string;
  type: DeviceType;
  name: string;
  village: string | null;
  address: string | null;
  lat: number | null;
  lng: number | null;
  altitude: number | null;
  status: DeviceStatus;
  sim_iccid: string | null;
  config: string | null;
  firmware: string | null;
  last_seen: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== 气象数据 ====================

export interface WeatherData {
  id: number;
  device_id: string;
  timestamp: string;
  air_temp: number | null;
  air_humidity: number | null;
  soil_temp: number | null;
  soil_moisture: number | null;
  soil_ec: number | null;
  light: number | null;
  wind_dir: number | null;
  wind_speed: number | null;
  rainfall: number | null;
  pressure: number | null;
  battery: number | null;
  solar_voltage: number | null;
}

export interface WeatherDaily {
  id: number;
  device_id: string;
  date: string;
  temp_max: number | null;
  temp_min: number | null;
  temp_avg: number | null;
  humidity_max: number | null;
  humidity_min: number | null;
  humidity_avg: number | null;
  rainfall_total: number | null;
  wind_speed_max: number | null;
  light_max: number | null;
  light_hours: number | null;
  effective_temp: number | null;
}

// ==================== 虫情数据 ====================

export interface PestData {
  id: number;
  device_id: string;
  timestamp: string;
  pest_type: string | null;
  latin_name: string | null;
  count: number;
  confidence: number | null;
  category: string | null;
  image_url: string | null;
  verified: number;
  verified_type: string | null;
  verified_count: number | null;
  created_at: string;
}

// ==================== 预警相关 ====================

export interface AlertRule {
  id: string;
  device_id: string | null;
  sensor_type: string;
  min_value: number | null;
  max_value: number | null;
  enabled: number;
  notify_sms: number;
  notify_push: number;
  created_at: string;
}

export interface AlertLog {
  id: string;
  rule_id: string | null;
  device_id: string;
  sensor_type: string;
  value: number | null;
  threshold: string | null;
  message: string;
  status: 'unread' | 'read' | 'handled';
  handled_by: string | null;
  handled_at: string | null;
  created_at: string;
}

// ==================== 服务商相关 ====================

export type ProviderType = 'machinery' | 'dryer';
export type AuditStatus = 'pending' | 'approved' | 'rejected';

export interface ServiceProvider {
  id: string;
  type: ProviderType;
  name: string;
  contact: string | null;
  phone: string;
  address: string | null;
  license_no: string | null;
  license_img: string | null;
  id_card_img: string | null;
  audit_status: AuditStatus;
  audit_note: string | null;
  audited_by: string | null;
  audited_at: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== 农机相关 ====================

export type MachineCategory = 'tillage' | 'sowing' | 'irrigation' | 'harvest' | 'drone' | 'other';
export type MachineStatus = 'idle' | 'working' | 'maintenance';

export interface Machine {
  id: string;
  provider_id: string;
  category: MachineCategory;
  brand: string | null;
  model: string | null;
  purchase_date: string | null;
  purchase_cost: number | null;
  power: string | null;
  fuel_type: string | null;
  work_width: string | null;
  efficiency: string | null;
  crop_type: string | null;
  terrain: string | null;
  status: MachineStatus;
  images: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== 烘干站相关 ====================

export interface DryerStation {
  id: string;
  provider_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  area_size: string | null;
  capacity: number | null;
  model: string | null;
  batch_size: string | null;
  images: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== 订单相关 ====================

export type OrderType = 'machinery' | 'dryer';
export type OrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';

export interface Order {
  id: string;
  type: OrderType;
  user_id: string;
  provider_id: string;
  machine_id: string | null;
  dryer_station_id: string | null;
  crop_variety: string | null;
  weight: number | null;
  start_date: string;
  end_date: string | null;
  time_slot: string | null;
  area: number | null;
  area_geo: string | null;
  content: string | null;
  amount: number | null;
  status: OrderStatus;
  confirmed_at: string | null;
  completed_at: string | null;
  cancel_reason: string | null;
  remark: string | null;
  created_at: string;
  updated_at: string;
}

// ==================== 通用响应 ====================

export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data?: T;
}

export interface PaginatedData<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== 查询参数 ====================

export interface PaginationQuery {
  page?: number;
  pageSize?: number;
}

export interface TimeRangeQuery {
  from?: string;
  to?: string;
}
