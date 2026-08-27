-- ============================================
-- 初始化管理员账号
-- 手机号: 13800000000  密码: admin123456
-- ============================================

INSERT OR IGNORE INTO users (id, phone, name, role, password, status)
VALUES (
  'admin-001',
  '13800000000',
  '系统管理员',
  'admin',
  'ac0e7d037817094e9e0b4441f9bae3209d67b02fa484917065f71b16109a1a78',
  'active'
);
