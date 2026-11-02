import React, { useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import Apartment3D from './Apartment3D';
import TwinHUD from './TwinHUD';

// Bộ điều hướng góc nhìn Camera mượt mà tới các khu vực phòng
function CameraController({ cameraMode }) {
  const { camera } = useThree();
  const controls = useThree((state) => state.controls);

  useEffect(() => {
    if (cameraMode === 'iso') {
      camera.position.set(10.5, 12.5, 10.5);
      if (controls) controls.target.set(0, 0.5, 0);
    } else if (cameraMode === 'top') {
      camera.position.set(0.01, 16, 0.01);
      if (controls) controls.target.set(0, 0, 0);
    } else if (cameraMode === 'living') {
      camera.position.set(-2.1, 4.5, 6.0);
      if (controls) controls.target.set(-2.1, 0.6, 2.1);
    } else if (cameraMode === 'kitchen') {
      camera.position.set(2.1, 4.5, 6.0);
      if (controls) controls.target.set(2.1, 0.6, 2.1);
    }
  }, [cameraMode, camera, controls]);

  return null;
}

export default function App() {
  const [twinData, setTwinData] = useState({
    reported: {
      temperature: 27.8,
      humidity: 66.3,
      light_level: 10,
      rssi: -65,
      light_living: 0,
      light_bed: 0,
      light_kitchen: 0,
      light_balcony: 0,
      fan_kitchen: 0
    },
    desired: {},
    mismatch: { detected: false },
    health_score: 100
  });

  const [cameraMode, setCameraMode] = useState('iso');
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

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: 'radial-gradient(circle at 50% 35%, #0f172a 0%, #020617 100%)'
      }}
    >
      {/* Lớp hiển thị 2D Glassmorphism HUD Overlay */}
      <TwinHUD
        twinData={twinData}
        onToggle={handleToggle}
        cameraMode={cameraMode}
        setCameraMode={setCameraMode}
        autoRotate={autoRotate}
        setAutoRotate={setAutoRotate}
      />

      {/* Không gian đồ họa 3D Three.js Canvas */}
      <Canvas
        shadows
        camera={{ position: [10.5, 12.5, 10.5], fov: 38 }}
        style={{ width: '100%', height: '100%' }}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <CameraController cameraMode={cameraMode} />
        <OrbitControls
          makeDefault
          autoRotate={autoRotate}
          autoRotateSpeed={1.0}
          enableRotate={true}
          enableZoom={true}
          maxPolarAngle={cameraMode === 'top' ? Math.PI : Math.PI / 2.15}
          minDistance={5}
          maxDistance={30}
          target={[0, 0.5, 0]}
        />
        <Apartment3D twinData={twinData} onToggle={handleToggle} />
      </Canvas>
    </div>
  );
}
