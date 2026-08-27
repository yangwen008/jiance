-- ============================================
-- 演示数据 - 各类型设备各5条
-- 使用方法: npx wrangler d1 execute agri-db --file=migrations/0003_seed_demo_data.sql
-- ============================================

-- ==================== 确保有各类设备 ====================
INSERT OR IGNORE INTO devices (id, type, name, village, address, lat, lng, altitude, status, last_seen) VALUES
  ('weather-01', 'weather', '气象站-东田', '东田村', '东田村村委会旁', 30.2512, 120.1563, 45, 'online', datetime('now')),
  ('weather-02', 'weather', '气象站-西坡', '西坡村', '西坡村农田中央', 30.2489, 120.1612, 42, 'online', datetime('now')),
  ('camera-01', 'camera', '摄像头-东田入口', '东田村', '东田村入口处', 30.2520, 120.1570, 46, 'online', datetime('now')),
  ('camera-02', 'camera', '摄像头-西坡稻田', '西坡村', '西坡村水稻田旁', 30.2495, 120.1620, 43, 'online', datetime('now')),
  ('pest-01', 'pest_monitor', '虫情仪-东田', '东田村', '东田村制种田', 30.2505, 120.1555, 44, 'online', datetime('now')),
  ('pest-02', 'pest_monitor', '虫情仪-西坡', '西坡村', '西坡村玉米地', 30.2480, 120.1605, 41, 'online', datetime('now')),
  ('multi-01', 'multispectral', '多光谱-东田', '东田村', '东田村实验田', 30.2515, 120.1568, 45, 'online', datetime('now'));

-- ==================== 气象数据 (5条) ====================
INSERT INTO weather_data (device_id, timestamp, air_temp, air_humidity, soil_temp, soil_moisture, soil_ec, light, wind_dir, wind_speed, rainfall, pressure, battery, solar_voltage) VALUES
  ('weather-01', '2026-08-27T08:00:00+08:00', 26.3, 78.5, 23.1, 42.3, 1.8, 32000, 135, 2.1, 0, 1013.2, 92, 13.1),
  ('weather-01', '2026-08-27T10:00:00+08:00', 29.8, 65.2, 25.6, 38.7, 1.9, 58000, 180, 3.5, 0, 1012.8, 88, 13.8),
  ('weather-01', '2026-08-27T12:00:00+08:00', 33.1, 55.8, 28.9, 35.2, 2.1, 72000, 225, 4.2, 0, 1012.1, 85, 14.2),
  ('weather-01', '2026-08-27T14:00:00+08:00', 34.5, 52.1, 30.2, 33.8, 2.2, 65000, 270, 5.8, 0, 1011.5, 82, 13.5),
  ('weather-01', '2026-08-27T16:00:00+08:00', 31.2, 60.3, 27.5, 36.5, 2.0, 28000, 315, 3.2, 2.5, 1012.0, 80, 12.8);

-- ==================== 虫情数据 (5条) ====================
INSERT INTO pest_data (device_id, timestamp, pest_type, latin_name, count, confidence, category, image_url) VALUES
  ('pest-01', '2026-08-27T06:30:00+08:00', '稻纵卷叶螟', 'Cnaphalocrocis medinalis', 18, 92.5, '一类', NULL),
  ('pest-01', '2026-08-27T09:00:00+08:00', '白背飞虱', 'Sogatella furcifera', 35, 88.3, '一类', NULL),
  ('pest-01', '2026-08-27T12:00:00+08:00', '二化螟', 'Chilo suppressalis', 8, 85.7, '一类', NULL),
  ('pest-02', '2026-08-27T07:00:00+08:00', '玉米螟', 'Ostrinia furnacalis', 22, 90.1, '一类', NULL),
  ('pest-02', '2026-08-27T10:30:00+08:00', '草地贪夜蛾', 'Spodoptera frugiperda', 12, 94.6, '一类', NULL);

-- ==================== 视频监控截图 (5条) ====================
INSERT INTO camera_snapshots (device_id, timestamp, image_url, type, note) VALUES
  ('camera-01', '2026-08-27T06:00:00+08:00', 'https://via.placeholder.com/640x480/333/fff?text=Camera-01+06:00', 'auto', '清晨自动抓拍'),
  ('camera-01', '2026-08-27T09:00:00+08:00', 'https://via.placeholder.com/640x480/333/fff?text=Camera-01+09:00', 'auto', '上午巡查'),
  ('camera-01', '2026-08-27T12:00:00+08:00', 'https://via.placeholder.com/640x480/333/fff?text=Camera-01+12:00', 'auto', '午间巡检'),
  ('camera-02', '2026-08-27T07:30:00+08:00', 'https://via.placeholder.com/640x480/333/fff?text=Camera-02+07:30', 'auto', '稻田晨拍'),
  ('camera-02', '2026-08-27T15:00:00+08:00', 'https://via.placeholder.com/640x480/333/fff?text=Camera-02+15:00', 'manual', '人工查看苗情');

-- ==================== 多光谱数据 (5条) ====================
INSERT INTO vegetation_data (device_id, timestamp, ndvi, gndvi, ndre, osavi, lci) VALUES
  ('multi-01', '2026-08-27T08:00:00+08:00', 0.72, 0.65, 0.38, 0.52, 0.81),
  ('multi-01', '2026-08-27T09:30:00+08:00', 0.74, 0.67, 0.40, 0.54, 0.83),
  ('multi-01', '2026-08-27T11:00:00+08:00', 0.71, 0.64, 0.37, 0.51, 0.80),
  ('multi-01', '2026-08-27T13:00:00+08:00', 0.69, 0.62, 0.35, 0.49, 0.78),
  ('multi-01', '2026-08-27T15:00:00+08:00', 0.73, 0.66, 0.39, 0.53, 0.82);

-- ==================== 预警规则 ====================
INSERT OR IGNORE INTO alert_rules (id, device_id, sensor_type, min_value, max_value, enabled, notify_sms, notify_push) VALUES
  ('rule-temp-high', NULL, 'temperature', NULL, 35, 1, 1, 1),
  ('rule-temp-low', NULL, 'temperature', 5, NULL, 1, 1, 1),
  ('rule-wind', NULL, 'wind_speed', NULL, 8, 1, 1, 1),
  ('rule-rain', NULL, 'rainfall', NULL, 50, 1, 1, 1),
  ('rule-pest', NULL, 'pest_count', NULL, 20, 1, 1, 1),
  ('rule-soil-dry', NULL, 'soil_moisture', 20, NULL, 1, 1, 1);
