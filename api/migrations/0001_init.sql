-- ============================================
-- 农业虫情监测平台 - 数据库初始化
-- D1 (SQLite) 数据库结构
-- ============================================

-- ==================== 用户与权限 ====================

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  phone       TEXT UNIQUE NOT NULL,
  name        TEXT,
  role        TEXT NOT NULL DEFAULT 'user',  -- admin / manager / user
  password    TEXT NOT NULL,                 -- bcrypt hash
  avatar      TEXT,
  status      TEXT NOT NULL DEFAULT 'active', -- active / disabled
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- ==================== 设备管理 ====================

CREATE TABLE IF NOT EXISTS devices (
  id          TEXT PRIMARY KEY,
  type        TEXT NOT NULL,          -- weather / camera / pest_monitor / multispectral
  name        TEXT NOT NULL,
  village     TEXT,                   -- 所在行政村
  address     TEXT,                   -- 详细地址
  lat         REAL,                   -- 纬度
  lng         REAL,                   -- 经度
  altitude    REAL,                   -- 海拔(m)
  status      TEXT NOT NULL DEFAULT 'online',  -- online / offline / alarm / maintenance
  sim_iccid   TEXT,                   -- 物联网卡号
  config      TEXT,                   -- JSON: 采集间隔、上报频率等
  firmware    TEXT,                   -- 固件版本
  last_seen   TEXT,                   -- 最后在线时间
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_devices_type ON devices(type);
CREATE INDEX IF NOT EXISTS idx_devices_village ON devices(village);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- ==================== 气象监测 ====================

CREATE TABLE IF NOT EXISTS weather_data (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       TEXT NOT NULL,
  timestamp       TEXT NOT NULL,
  air_temp        REAL,    -- 空气温度 ℃
  air_humidity    REAL,    -- 空气湿度 %RH
  soil_temp       REAL,    -- 土壤温度 ℃
  soil_moisture   REAL,    -- 土壤水分 %
  soil_ec         REAL,    -- 土壤电导率 mS/cm
  light           REAL,    -- 光照强度 Lux
  wind_dir        REAL,    -- 风向 °
  wind_speed      REAL,    -- 风速 m/s
  rainfall        REAL,    -- 降雨量 mm
  pressure        REAL,    -- 大气压 hPa
  battery         REAL,    -- 电池电量 %
  solar_voltage   REAL     -- 太阳能电压 V
);

CREATE INDEX IF NOT EXISTS idx_weather_device_time ON weather_data(device_id, timestamp);

-- 气象日统计（定时任务汇总）
CREATE TABLE IF NOT EXISTS weather_daily (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id       TEXT NOT NULL,
  date            TEXT NOT NULL,           -- YYYY-MM-DD
  temp_max        REAL,
  temp_min        REAL,
  temp_avg        REAL,
  humidity_max    REAL,
  humidity_min    REAL,
  humidity_avg    REAL,
  rainfall_total  REAL,    -- 日累计降雨
  wind_speed_max  REAL,
  light_max       REAL,
  light_hours     REAL,    -- 有效光照时长
  effective_temp  REAL,    -- 有效积温（日均温>10℃部分）
  UNIQUE(device_id, date)
);

CREATE INDEX IF NOT EXISTS idx_weather_daily_device ON weather_daily(device_id, date);

-- ==================== 虫情监测 ====================

CREATE TABLE IF NOT EXISTS pest_data (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id     TEXT NOT NULL,
  timestamp     TEXT NOT NULL,
  pest_type     TEXT,              -- AI识别害虫种类
  latin_name    TEXT,              -- 拉丁学名
  count         INTEGER DEFAULT 0, -- 数量
  confidence    REAL,              -- AI置信度 0-100
  category      TEXT,              -- 一类/二类/其他
  image_url     TEXT,              -- 虫体图片R2路径
  verified      INTEGER DEFAULT 0, -- 是否人工复核 0/1
  verified_type TEXT,              -- 人工校正种类
  verified_count INTEGER,          -- 人工校正数量
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pest_device_time ON pest_data(device_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_pest_type ON pest_data(pest_type);
CREATE INDEX IF NOT EXISTS idx_pest_verified ON pest_data(verified);

-- 虫情日统计
CREATE TABLE IF NOT EXISTS pest_daily (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id     TEXT NOT NULL,
  date          TEXT NOT NULL,
  pest_type     TEXT NOT NULL,
  total_count   INTEGER DEFAULT 0,
  avg_confidence REAL,
  UNIQUE(device_id, date, pest_type)
);

CREATE INDEX IF NOT EXISTS idx_pest_daily_device ON pest_daily(device_id, date);

-- ==================== 植被监测（多光谱） ====================

CREATE TABLE IF NOT EXISTS vegetation_data (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  ndvi        REAL,
  gndvi       REAL,
  ndre        REAL,
  osavi       REAL,
  lci         REAL,
  image_url   TEXT
);

CREATE INDEX IF NOT EXISTS idx_veg_device_time ON vegetation_data(device_id, timestamp);

-- ==================== 视频监控 ====================

CREATE TABLE IF NOT EXISTS camera_snapshots (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id   TEXT NOT NULL,
  timestamp   TEXT NOT NULL,
  image_url   TEXT NOT NULL,        -- R2路径
  type        TEXT DEFAULT 'auto',  -- auto / manual / alarm
  note        TEXT                  -- 备注（苗情管理用）
);

CREATE INDEX IF NOT EXISTS idx_snapshot_device_time ON camera_snapshots(device_id, timestamp);

-- ==================== 预警管理 ====================

CREATE TABLE IF NOT EXISTS alert_rules (
  id          TEXT PRIMARY KEY,
  device_id   TEXT,                 -- NULL表示全局规则
  sensor_type TEXT NOT NULL,        -- temperature / humidity / wind_speed / rainfall / pest_count ...
  min_value   REAL,
  max_value   REAL,
  enabled     INTEGER NOT NULL DEFAULT 1,
  notify_sms  INTEGER NOT NULL DEFAULT 1,
  notify_push INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS alert_logs (
  id          TEXT PRIMARY KEY,
  rule_id     TEXT,
  device_id   TEXT NOT NULL,
  sensor_type TEXT NOT NULL,
  value       REAL,
  threshold   TEXT,                 -- 触发的阈值描述
  message     TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'unread',  -- unread / read / handled
  handled_by  TEXT,                 -- 处理人
  handled_at  TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_alert_status ON alert_logs(status);
CREATE INDEX IF NOT EXISTS idx_alert_device ON alert_logs(device_id);
CREATE INDEX IF NOT EXISTS idx_alert_time ON alert_logs(created_at);

-- ==================== 服务商管理 ====================

CREATE TABLE IF NOT EXISTS service_providers (
  id            TEXT PRIMARY KEY,
  type          TEXT NOT NULL,       -- machinery / dryer
  name          TEXT NOT NULL,
  contact       TEXT,
  phone         TEXT NOT NULL,
  address       TEXT,
  license_no    TEXT,                -- 营业执照号
  license_img   TEXT,                -- 营业执照图片R2路径
  id_card_img   TEXT,                -- 身份证图片R2路径
  audit_status  TEXT NOT NULL DEFAULT 'pending',  -- pending / approved / rejected
  audit_note    TEXT,
  audited_by    TEXT,
  audited_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_provider_type ON service_providers(type);
CREATE INDEX IF NOT EXISTS idx_provider_audit ON service_providers(audit_status);

-- ==================== 农机管理 ====================

CREATE TABLE IF NOT EXISTS machines (
  id            TEXT PRIMARY KEY,
  provider_id   TEXT NOT NULL REFERENCES service_providers(id),
  category      TEXT NOT NULL,       -- tillage / sowing / irrigation / harvest / drone / other
  brand         TEXT,
  model         TEXT,
  purchase_date TEXT,
  purchase_cost REAL,
  power         TEXT,                -- 功率(kW)
  fuel_type     TEXT,                -- 燃油类型
  work_width    TEXT,                -- 作业幅宽(m)
  efficiency    TEXT,                -- 每小时作业效率(亩/h)
  crop_type     TEXT,                -- 适配作物(逗号分隔)
  terrain       TEXT,                -- 适用地形
  status        TEXT NOT NULL DEFAULT 'idle',  -- idle / working / maintenance
  images        TEXT,                -- JSON: 图片URL数组
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_machine_provider ON machines(provider_id);
CREATE INDEX IF NOT EXISTS idx_machine_category ON machines(category);
CREATE INDEX IF NOT EXISTS idx_machine_status ON machines(status);

-- ==================== 烘干站点 ====================

CREATE TABLE IF NOT EXISTS dryer_stations (
  id            TEXT PRIMARY KEY,
  provider_id   TEXT NOT NULL REFERENCES service_providers(id),
  name          TEXT NOT NULL,
  address       TEXT,
  lat           REAL,
  lng           REAL,
  area_size     TEXT,                -- 场地面积
  capacity      REAL,                -- 最大容纳量(kg)
  model         TEXT,                -- 设备型号
  batch_size    TEXT,                -- 处理批次
  images        TEXT,                -- JSON: 图片URL数组
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_dryer_provider ON dryer_stations(provider_id);

-- ==================== 预约订单 ====================

CREATE TABLE IF NOT EXISTS orders (
  id              TEXT PRIMARY KEY,
  type            TEXT NOT NULL,       -- machinery / dryer
  user_id         TEXT NOT NULL REFERENCES users(id),
  provider_id     TEXT NOT NULL REFERENCES service_providers(id),
  machine_id      TEXT,                -- 农机预约时
  dryer_station_id TEXT,               -- 烘干预约时
  crop_variety    TEXT,                -- 种子品种（烘干）
  weight          REAL,                -- 种子重量(kg)
  start_date      TEXT NOT NULL,
  end_date        TEXT,
  time_slot       TEXT,                -- 时段
  area            REAL,                -- 作业面积(亩)
  area_geo        TEXT,                -- GIS地块GeoJSON
  content         TEXT,                -- 作业内容/特殊要求
  amount          REAL,                -- 费用(元)
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending / confirmed / in_progress / completed / cancelled
  confirmed_at    TEXT,
  completed_at    TEXT,
  cancel_reason   TEXT,
  remark          TEXT,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_order_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_order_provider ON orders(provider_id);
CREATE INDEX IF NOT EXISTS idx_order_type ON orders(type);
CREATE INDEX IF NOT EXISTS idx_order_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_date ON orders(start_date);

-- ==================== 作物模型库 ====================

CREATE TABLE IF NOT EXISTS crop_models (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,          -- 品种名
  region      TEXT,                   -- 适宜区域
  soil_type   TEXT,                   -- 适配土壤
  yield_est   TEXT,                   -- 预估产量
  stages      TEXT,                   -- JSON: 生育期阶段及环境需求
  kc_values   TEXT,                   -- JSON: 各期Kc系数
  pest_risks  TEXT,                   -- JSON: 常见病虫害及防控方案
  irrigation  TEXT,                   -- JSON: 灌溉建议
  fertilize   TEXT,                   -- JSON: 施肥建议
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ==================== 系统配置 ====================

CREATE TABLE IF NOT EXISTS system_config (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 初始配置
INSERT OR IGNORE INTO system_config (key, value) VALUES
  ('site_name', '农业虫情监测平台'),
  ('data_retention_days', '365'),
  ('alert_sms_enabled', 'true'),
  ('accumulation_base_temp', '10');
