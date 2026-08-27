-- ============================================
-- 演示数据 - 社会化服务模块
-- ============================================

-- 服务商
INSERT OR IGNORE INTO service_providers (id, type, name, contact, phone, address, license_no, audit_status) VALUES
  ('prov-01', 'machinery', '金丰农机合作社', '张建国', '13900001111', '东田村农机大院', '91330000MA2XXXXX1', 'approved'),
  ('prov-02', 'machinery', '丰收农机服务公司', '李大明', '13900002222', '西坡镇工业园', '91330000MA2XXXXX2', 'approved'),
  ('prov-03', 'dryer', '谷丰烘干中心', '王守信', '13900003333', '东田村粮库旁', '91330000MA2XXXXX3', 'approved'),
  ('prov-04', 'dryer', '惠农烘干站', '赵德才', '13900004444', '西坡镇公路边', '91330000MA2XXXXX4', 'pending');

-- 农机
INSERT OR IGNORE INTO machines (id, provider_id, category, brand, model, power, fuel_type, work_width, efficiency, crop_type, terrain, status) VALUES
  ('mach-01', 'prov-01', 'harvest', '久保田', 'PRO988Q', '68kW', '柴油', '2.0m', '5亩/h', '水稻,小麦', '平原', 'idle'),
  ('mach-02', 'prov-01', 'tillage', '东方红', 'LX2004', '147kW', '柴油', '3.5m', '15亩/h', '水稻,玉米,小麦', '平原,丘陵', 'idle'),
  ('mach-03', 'prov-02', 'drone', '大疆', 'T60', '12kW', '电动', '6m', '320亩/h', '水稻,小麦,玉米', '全部', 'idle'),
  ('mach-04', 'prov-02', 'sowing', '雷沃', '2BMSF-8', '45kW', '柴油', '2.4m', '8亩/h', '小麦,玉米', '平原', 'working'),
  ('mach-05', 'prov-01', 'irrigation', '大禹', 'DYP-315', '15kW', '电动', '315m', '50亩/h', '全部', '平原', 'idle');

-- 烘干站
INSERT OR IGNORE INTO dryer_stations (id, provider_id, name, address, lat, lng, capacity, model, batch_size) VALUES
  ('dryer-01', 'prov-03', '谷丰1号烘干塔', '东田村粮库旁', 30.2530, 120.1580, 30000, '三久PRO-300HB', '15吨/批'),
  ('dryer-02', 'prov-03', '谷丰2号烘干塔', '东田村粮库旁', 30.2532, 120.1582, 20000, '三久DC-200', '10吨/批'),
  ('dryer-03', 'prov-04', '惠农烘干线', '西坡镇公路边', 30.2475, 120.1630, 50000, '中联辰5HXG-30', '25吨/批');

-- 订单
INSERT OR IGNORE INTO orders (id, type, user_id, provider_id, machine_id, start_date, area, amount, status) VALUES
  ('order-01', 'machinery', 'admin-001', 'prov-01', 'mach-01', '2026-08-28', 50, 3500, 'pending'),
  ('order-02', 'machinery', 'admin-001', 'prov-02', 'mach-03', '2026-08-29', 200, 1600, 'confirmed'),
  ('order-03', 'dryer', 'admin-001', 'prov-03', NULL, '2026-08-30', NULL, 4500, 'pending');
