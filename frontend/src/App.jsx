import React, { useState, useEffect, useMemo } from 'react';
import Apartment3D from './Apartment3D';
import TwinHUD from './TwinHUD';

// Bộ giải mã mã thời tiết WMO (World Meteorological Organization)
export function parseWeatherCode(code, isDay, rain) {
  if (rain > 0.5 || [61, 63, 65, 80, 81, 82].includes(code)) {
    return { label: 'Mưa rào rải rác', isRaining: true, icon: '🌧️' };
  }
  if ([95, 96, 99].includes(code)) {
    return { label: 'Giông bão sấm sét', isRaining: true, icon: '⛈️' };
  }
  if ([51, 53, 55, 56, 57].includes(code) || (rain > 0 && rain <= 0.5)) {
    return { label: 'Mưa phùn nhẹ', isRaining: true, icon: '🌦️' };
  }
  if ([71, 73, 75, 77, 85, 86].includes(code)) {
    return { label: 'Mưa tuyết / lạnh giá', isRaining: false, icon: '❄️' };
  }
  if ([45, 48].includes(code)) {
    return { label: 'Sương mù ẩm ướt', isRaining: false, icon: '🌫️' };
  }
  if (code === 3) {
    return { label: 'Nhiều mây u ám', isRaining: false, icon: '☁️' };
  }
  if (code === 2) {
    return { label: isDay ? 'Mây rải rác' : 'Đêm mây nhẹ', isRaining: false, icon: isDay ? '⛅' : '☁️' };
  }
  if (code === 1) {
    return { label: isDay ? 'Trời nắng nhẹ' : 'Đêm trời quang', isRaining: false, icon: isDay ? '🌤️' : '🌙' };
  }
  return { label: isDay ? 'Trời nắng quang đãng' : 'Đêm thanh tĩnh', isRaining: false, icon: isDay ? '☀️' : '🌙' };
}

export default function App() {
  const [twinData, setTwinData] = useState({
    reported: {
      temperature: 28.5,
      humidity: 65.0,
      light_level: 12,
      rssi: -62,
      light_living: 0,
      light_bed: 0,
      light_kitchen: 0,
      light_balcony: 0,
      fan_kitchen: 0,
      fan_speed: 0,
      fire_alarm: 0
    },
    desired: {},
    mismatch: { detected: false },
    health_score: 100,
    severity: 'NORMAL',
    status_message: 'Hệ thống hoạt động tối ưu'
  });

  // viewMode: 'overview' | 'top' | 'living' | 'bedroom' | 'kitchen' | 'balcony'
  const [viewMode, setViewMode] = useState('overview');
  const [autoRotate, setAutoRotate] = useState(false);

  // Weather Engine State: 'live' (default) | 'sunny_day' | 'sunset' | 'rainy_storm' | 'clear_night'
  const [weatherMode, setWeatherMode] = useState('live');
  const [liveWeather, setLiveWeather] = useState(null);

  // 1. Fetch dữ liệu thời tiết thực tế từ Open-Meteo API (Hà Nội, Việt Nam)
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(
          'https://api.open-meteo.com/v1/forecast?latitude=21.0285&longitude=105.8542&current=temperature_2m,relative_humidity_2m,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m&timezone=Asia%2FBangkok'
        );
        if (res.ok) {
          const data = await res.json();
          if (data && data.current) {
            const cur = data.current;
            const parsed = parseWeatherCode(cur.weather_code, cur.is_day === 1, cur.rain || cur.precipitation);
            setLiveWeather({
              outdoorTemp: cur.temperature_2m,
              outdoorHumidity: cur.relative_humidity_2m,
              windSpeed: cur.wind_speed_10m,
              cloudCover: cur.cloud_cover,
              isDay: cur.is_day === 1,
              isRaining: parsed.isRaining,
              weatherLabel: parsed.label,
              icon: parsed.icon
            });
          }
        }
      } catch (e) {
        console.warn('[Open-Meteo Live Fetch Warning]', e);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 5 * 60 * 1000); // 5 phút cập nhật 1 lần
    return () => clearInterval(interval);
  }, []);

  // 2. Tính toán trạng thái thời tiết hiệu dụng (hỗ trợ 4 chế độ ghi đè phục vụ thuyết trình)
  const weatherState = useMemo(() => {
    if (weatherMode === 'sunny_day') {
      return {
        mode: 'sunny_day',
        outdoorTemp: 32.5,
        outdoorHumidity: 52,
        windSpeed: 12.0,
        cloudCover: 10,
        isDay: true,
        isRaining: false,
        weatherLabel: 'Nắng ấm ban ngày (Demo)',
        icon: '☀️'
      };
    }
    if (weatherMode === 'sunset') {
      return {
        mode: 'sunset',
        outdoorTemp: 28.0,
        outdoorHumidity: 65,
        windSpeed: 8.5,
        cloudCover: 30,
        isDay: true,
        isRaining: false,
        weatherLabel: 'Hoàng hôn rực rỡ (Demo)',
        icon: '🌇'
      };
    }
    if (weatherMode === 'rainy_storm') {
      return {
        mode: 'rainy_storm',
        outdoorTemp: 22.0,
        outdoorHumidity: 95,
        windSpeed: 36.0,
        cloudCover: 98,
        isDay: false,
        isRaining: true,
        weatherLabel: 'Mưa giông sấm sét (Demo 3D)',
        icon: '⛈️'
      };
    }
    if (weatherMode === 'clear_night') {
      return {
        mode: 'clear_night',
        outdoorTemp: 23.5,
        outdoorHumidity: 74,
        windSpeed: 6.0,
        cloudCover: 5,
        isDay: false,
        isRaining: false,
        weatherLabel: 'Đêm thanh tĩnh (Demo)',
        icon: '🌙'
      };
    }
    // Chế độ 'live' thực tế
    if (liveWeather) {
      return {
        mode: 'live',
        ...liveWeather
      };
    }
    // Dữ liệu dự phòng mặc định khi đang chờ API phản hồi
    const currentHour = new Date().getHours();
    const isDayTime = currentHour >= 6 && currentHour < 18;
    return {
      mode: 'live',
      outdoorTemp: 24.5,
      outdoorHumidity: 70,
      windSpeed: 8.0,
      cloudCover: 20,
      isDay: isDayTime,
      isRaining: false,
      weatherLabel: isDayTime ? 'Nắng quang đãng (Live API)' : 'Đêm quang đãng (Live API)',
      icon: isDayTime ? '☀️' : '🌙'
    };
  }, [weatherMode, liveWeather]);

  // 3. Kết nối WebSocket thời gian thực tới Backend (Cổng 5000)
  useEffect(() => {
    const wsUrl = `ws://${window.location.hostname}:5000`;
    let socket;

    try {
      socket = new WebSocket(wsUrl);
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setTwinData(data);
        } catch (e) {
          console.error('[WS Parse Error]', e);
        }
      };
      socket.onerror = (err) => {
        console.warn('[WS Warning] Không thể kết nối ngay tới WebSocket Backend:', err);
      };
    } catch (err) {
      console.warn('[WS Init Warning]', err);
    }

    return () => {
      if (socket) socket.close();
    };
  }, []);

  // 4. Gửi lệnh điều khiển hai chiều RPC tới Backend và ESP32
  const handleToggle = async (method, state) => {
    // Cập nhật lạc quan (Optimistic Update) giao diện ngay lập tức
    const mapping = {
      setLiving: 'light_living',
      setBed: 'light_bed',
      setKitchen: 'light_kitchen',
      setBalcony: 'light_balcony',
      setFan: 'fan_kitchen',
      setAlarm: 'fire_alarm'
    };
    const key = mapping[method];

    if (key) {
      setTwinData((prev) => ({
        ...prev,
        reported: {
          ...prev.reported,
          [key]: typeof state === 'number' ? (state > 0 ? 1 : 0) : (state ? 1 : 0),
          ...(method === 'setFan' ? { fan_speed: typeof state === 'number' ? state : (state ? 3 : 0) } : {})
        }
      }));
    }

    try {
      const backendUrl = `http://${window.location.hostname}:5000/api/rpc`;
      await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ method, params: state })
      });
    } catch (err) {
      console.error('[RPC Error]', err);
    }

    // Gửi trực tiếp tức thì từ trình duyệt tới IP của ESP32 qua mạng LAN
    const esp32Ip = twinData?.reported?.ip;
    if (esp32Ip) {
      try {
        const valParam = typeof state === 'boolean' ? (state ? 1 : 0) : state;
        fetch(`http://${esp32Ip}/rpc?method=${method}&params=${valParam}`, { mode: 'no-cors' }).catch(() => {});
      } catch (e) {
        // Bỏ qua lỗi kết nối trực tiếp nếu ESP32 đang tắt
      }
    }
  };

  // 5. Hàm mô phỏng / kiểm thử hiện tượng Sai lệch vật lý (Actuator Mismatch)
  const handleToggleMismatch = (zoneKey) => {
    setTwinData((prev) => {
      const isMismatchActive = prev.mismatch?.detected && prev.mismatch?.zone === zoneKey;
      const willBeMismatch = !isMismatchActive;
      const roomNames = {
        living: 'Đèn Phòng khách',
        bed: 'Đèn Phòng ngủ',
        kitchen: 'Đèn Bếp',
        balcony: 'Đèn Ban công',
        fan: 'Quạt Hút Bếp'
      };
      return {
        ...prev,
        mismatch: willBeMismatch
          ? { detected: true, zone: zoneKey }
          : { detected: false, zone: null },
        health_score: willBeMismatch ? 60 : 100,
        severity: willBeMismatch ? 'WARNING' : 'NORMAL',
        status_message: willBeMismatch ? `Lệch trạng thái ${roomNames[zoneKey] || zoneKey}` : 'Hệ thống hoạt động tối ưu'
      };
    });
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 35%, #0f172a 0%, #020617 100%)',
        userSelect: 'none'
      }}
    >
      {/* Lớp hiển thị 2D Glassmorphism HUD Overlay */}
      <TwinHUD
        twinData={twinData}
        onToggle={handleToggle}
        viewMode={viewMode}
        setViewMode={setViewMode}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
        weatherState={weatherState}
        onWeatherChange={setWeatherMode}
      />

      {/* Không gian đồ họa 3D Three.js Digital Twin & Villa Architecture */}
      <Apartment3D
        twinData={twinData}
        onToggle={handleToggle}
        onToggleMismatch={handleToggleMismatch}
        viewMode={viewMode}
        setViewMode={setViewMode}
        autoRotate={autoRotate}
        weatherState={weatherState}
      />
    </div>
  );
}
