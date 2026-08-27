# 硬件设备对接文档

## 概述

本文档描述农业监测硬件设备如何向平台上报数据。平台采用 RESTful API，设备通过 HTTP POST 请求上报数据。

**API 基础地址：** `https://agri-monitor-api.yangwen008007.workers.dev`

---

## 一、设备注册

设备需先在平台管理后台注册，获取 `device_id`。注册时需填写：

| 字段 | 说明 | 必填 |
|------|------|------|
| type | 设备类型：`weather` / `camera` / `pest_monitor` / `multispectral` | ✅ |
| name | 设备名称 | ✅ |
| village | 所在行政村 | |
| address | 详细地址 | |
| lat | 纬度（WGS84） | |
| lng | 经度（WGS84） | |
| altitude | 海拔（米） | |
| sim_iccid | 物联网卡号 | |
| config | JSON 配置（采集间隔等） | |
| firmware | 固件版本号 | |

---

## 二、数据上报接口

### 2.1 气象站数据上报

**请求：**
```
POST /api/devices/{device_id}/data
Content-Type: application/json
```

**请求体：**
```json
{
  "timestamp": "2026-08-27T10:30:00+08:00",
  "air_temp": 28.5,
  "air_humidity": 65.2,
  "soil_temp": 22.3,
  "soil_moisture": 35.8,
  "soil_ec": 1.2,
  "light": 45000,
  "wind_dir": 180,
  "wind_speed": 3.2,
  "rainfall": 0,
  "pressure": 1013.25,
  "battery": 85,
  "solar_voltage": 12.6
}
```

**字段说明：**

| 字段 | 类型 | 单位 | 说明 |
|------|------|------|------|
| timestamp | string | ISO 8601 | 采集时间，不传则用服务器时间 |
| air_temp | number | ℃ | 空气温度 |
| air_humidity | number | %RH | 空气湿度 |
| soil_temp | number | ℃ | 土壤温度 |
| soil_moisture | number | % | 土壤水分 |
| soil_ec | number | mS/cm | 土壤电导率 |
| light | number | Lux | 光照强度 |
| wind_dir | number | ° | 风向（0-360，北为0） |
| wind_speed | number | m/s | 风速 |
| rainfall | number | mm | 降雨量 |
| pressure | number | hPa | 大气压 |
| battery | number | % | 电池电量 |
| solar_voltage | number | V | 太阳能板电压 |

**响应：**
```json
{
  "code": 0,
  "message": "数据接收成功"
}
```

---

### 2.2 虫情监测仪数据上报

虫情数据通过 AI 识别后上报。设备拍照后将图片上传至 R2，再调用识别接口。

**步骤 1：上传虫体图片到 R2**
```
PUT /api/upload/pest-image
Content-Type: image/jpeg
Authorization: Bearer {token}

[二进制图片数据]
```

返回：
```json
{
  "code": 0,
  "data": {
    "url": "https://r2.example.com/pest/2026-08-27/xxx.jpg"
  }
}
```

**步骤 2：调用 AI 识别**
```
POST /api/ai/identify-pest
Content-Type: application/json
Authorization: Bearer {token}

{
  "imageUrl": "https://r2.example.com/pest/2026-08-27/xxx.jpg"
}
```

返回：
```json
{
  "code": 0,
  "data": {
    "species": "稻纵卷叶螟",
    "latin_name": "Cnaphalocrocis medinalis",
    "count": 12,
    "confidence": 87,
    "category": "一类",
    "description": "体长约15mm，黄褐色，前翅有横纹..."
  }
}
```

**步骤 3：写入虫情数据（设备端直接上报）**
```
POST /api/devices/{device_id}/data
Content-Type: application/json

{
  "timestamp": "2026-08-27T10:30:00+08:00",
  "pest_type": "稻纵卷叶螟",
  "latin_name": "Cnaphalocrocis medinalis",
  "count": 12,
  "confidence": 87,
  "category": "一类",
  "image_url": "https://r2.example.com/pest/2026-08-27/xxx.jpg"
}
```

> ⚠️ 注意：当前 `/api/devices/:id/data` 接口只处理了 `weather` 类型设备的数据写入。
> `pest_monitor` 类型设备的数据写入需要后端补充实现（见下方待开发项）。

---

### 2.3 视频监控截图上报

**请求：**
```
POST /api/devices/{device_id}/data
Content-Type: application/json

{
  "timestamp": "2026-08-27T10:30:00+08:00",
  "image_url": "https://r2.example.com/snapshot/xxx.jpg",
  "type": "auto"
}
```

---

## 三、设备心跳

设备应定期（建议每 5 分钟）向平台发送心跳，表明在线状态。可复用数据上报接口，无数据时发送空请求：

```
POST /api/devices/{device_id}/data
Content-Type: application/json

{
  "timestamp": "2026-08-27T10:30:00+08:00"
}
```

平台会自动更新 `last_seen` 字段和 `status` 为 `online`。

---

## 四、认证说明

当前设备上报接口 **无需认证**（公开接口）。生产环境建议：

1. 为每个设备分配独立的 `api_key`
2. 请求头携带 `X-Device-Key: {api_key}`
3. 后端验证 key 后才处理数据

---

## 五、错误码

| code | 说明 |
|------|------|
| 0 | 成功 |
| -1 | 通用错误 |
| 400 | 参数错误 |
| 401 | 未认证 |
| 403 | 无权限 |
| 404 | 设备不存在 |
| 500 | 服务器错误 |

---

## 六、待开发项

以下功能需要后续补充实现：

| 优先级 | 功能 | 说明 |
|--------|------|------|
| 🔴 高 | 虫情数据上报写入 | `device.ts` 的 `/data` 接口需增加 `pest_monitor` 类型处理 |
| 🔴 高 | 设备认证机制 | 添加 `X-Device-Key` 验证中间件 |
| 🟡 中 | 图片上传接口 | R2 文件上传端点（当前缺失） |
| 🟡 中 | 截图数据写入 | `camera` 类型设备数据处理 |
| 🟢 低 | 多光谱数据写入 | `multispectral` 类型设备数据处理 |
| 🟢 低 | 预警自动触发 | 数据上报时检查阈值并生成告警 |
| 🟢 低 | 日统计定时汇总 | Cron Trigger 汇总 weather_daily / pest_daily |
