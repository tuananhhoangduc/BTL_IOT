const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const TB_HOST = process.env.TB_HOST || 'thingsboard.cloud';
const TB_PORT = process.env.TB_PORT || 1883;
const TB_TOKEN = process.env.TB_TOKEN || 'YOUR_TOKEN';
const PORT = process.env.PORT || 5000;

// Trạng thái trung tâm của Bản sao số (Digital Twin State)
const twinState = {
  reported: {
    light_living: 0,
    light_bed: 0,
    light_kitchen: 0,
    light_balcony: 0,
    fan_kitchen: 0,
    fire_alarm: 0,
    temperature: 27.8,
    humidity: 66.3,
    light_level: 10,
    rssi: -65
  },
  desired: {
    light_living: 0,
    light_bed: 0,
    light_kitchen: 0,
    light_balcony: 0,
    fan_kitchen: 0
  },
  mismatch: {
    detected: false,
    zone: null
  },
  health_score: 100,
  lastUpdate: Date.now()
};

// Lưu trữ IP cục bộ của mạch ESP32 để chuyển tiếp RPC trực tiếp
let lastEsp32Ip = null;

// Hàm phát sóng dữ liệu cập nhật tới toàn bộ trình duyệt đang mở
function broadcastTwinUpdate() {
  const payload = JSON.stringify(twinState);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Thuật toán đối soát sai lệch phần cứng (Actuator Mismatch Detection)
function evaluateMismatch() {
  const keys = ['light_living', 'light_bed', 'light_kitchen', 'light_balcony', 'fan_kitchen'];
  let isMismatch = false;
  let mismatchedRoom = null;

  for (const k of keys) {
    if (twinState.desired[k] !== undefined && twinState.desired[k] !== twinState.reported[k]) {
      isMismatch = true;
      mismatchedRoom = k;
      break;
    }
  }

  twinState.mismatch.detected = isMismatch;
  twinState.mismatch.zone = mismatchedRoom;
  twinState.health_score = isMismatch ? 60 : 100;
}

// API REST: Nhận lệnh điều khiển từ giao diện Web 3D và gửi trực tiếp tới ESP32
app.post('/api/rpc', (req, res) => {
  const { method, params } = req.body;
  if (!method || params === undefined) {
    return res.status(400).json({ error: 'Thiếu tham số method hoặc params' });
  }

  const mapping = {
    setLiving: 'light_living',
    setBed: 'light_bed',
    setKitchen: 'light_kitchen',
    setBalcony: 'light_balcony',
    setFan: 'fan_kitchen',
    setAlarm: 'fire_alarm'
  };

  const targetKey = mapping[method];
  if (targetKey) {
    twinState.desired[targetKey] = typeof params === 'number' ? (params > 0 ? 1 : 0) : (params ? 1 : 0);
  }
  if (method === 'setFan') {
    twinState.desired.fan_speed = typeof params === 'number' ? params : (params ? 3 : 0);
  }

  // Gửi lệnh trực tiếp tức thì qua mạng LAN tới ESP32 Local Server
  if (lastEsp32Ip) {
    const valParam = typeof params === 'boolean' ? (params ? 1 : 0) : params;
    const url = `http://${lastEsp32Ip}/rpc?method=${method}&params=${valParam}`;
    http.get(url, (espRes) => {
      // Đã gửi RPC tới ESP32
    }).on('error', (err) => {
      console.warn(`[RPC -> ESP32] Lỗi kết nối tới ${url}:`, err.message);
    });
  }

  evaluateMismatch();
  broadcastTwinUpdate();
  return res.json({ status: 'success', method, params });
});

// API REST: Nhận dữ liệu Telemetry từ ESP32 gửi lên
app.post('/api/telemetry', (req, res) => {
  if (req.body.ip) {
    lastEsp32Ip = req.body.ip;
  } else if (!lastEsp32Ip && req.ip) {
    lastEsp32Ip = req.ip.replace('::ffff:', '');
  }
  Object.assign(twinState.reported, req.body);
  twinState.lastUpdate = Date.now();
  evaluateMismatch();
  broadcastTwinUpdate();
  res.json({ status: 'ok' });
});

// API REST: Lấy toàn bộ trạng thái hiện tại của Twin
app.get('/api/state', (req, res) => {
  res.json(twinState);
});

// Quản lý kết nối WebSocket
wss.on('connection', (ws) => {
  ws.send(JSON.stringify(twinState));
});

server.listen(PORT, () => {
  console.log(`[Backend] Dịch vụ Digital Twin đang lắng nghe trên cổng ${PORT}`);
});

