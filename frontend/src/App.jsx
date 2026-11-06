import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import Apartment3D from './Apartment3D';
import TwinHUD from './TwinHUD';

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
    health_score: 100
  });

  // viewMode: 'overview' | 'top' | 'living' | 'bedroom' | 'kitchen' | 'balcony'
  const [viewMode, setViewMode] = useState('overview');
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    // Kết nối WebSocket thời gian thực tới Backend (Cổng 5000)
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

  // Gửi lệnh điều khiển hai chiều RPC tới Backend
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
  };

  // Hàm mô phỏng / kiểm thử hiện tượng Sai lệch vật lý (Actuator Mismatch)
  const handleToggleMismatch = (zoneKey) => {
    setTwinData((prev) => {
      const isMismatchActive = prev.mismatch?.detected && prev.mismatch?.zone === zoneKey;
      return {
        ...prev,
        mismatch: isMismatchActive
          ? { detected: false }
          : { detected: true, zone: zoneKey },
        health_score: isMismatchActive ? 100 : 60
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
      />

      {/* Không gian đồ họa 3D Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [16, 18, 16], fov: 42, near: 0.1, far: 1000 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Apartment3D
          twinData={twinData}
          onToggle={handleToggle}
          onToggleMismatch={handleToggleMismatch}
          viewMode={viewMode}
          setViewMode={setViewMode}
          autoRotate={autoRotate}
        />
      </Canvas>
    </div>
  );
}
