import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { RoundedBox, Html, Grid, OrbitControls } from '@react-three/drei';

// =========================================================================
// A. CẤU HÌNH TỌA ĐỘ VÀ KHÔNG GIAN 4 PHÒNG CHUẨN ĐẶC TẢ (ROOM_CONFIG)
// =========================================================================
export const ROOM_CONFIG = {
  bedroom: {
    id: 'bedroom',
    name: 'Phòng Ngủ',
    center: [-4, 1.7, -3.5],
    defaultYaw: -0.4,
    lightPos: [-4, 3.35, -4],
    switchPos: [-0.3, 1.45, -1.5],
    badgePos: [-4, 2.9, -4],
    lightKey: 'light_bed',
    toggleMethod: 'setBed',
    portals: [
      { to: 'living', label: '➔ Bước sang Phòng Khách', pos: [-2.0, 1.1, -0.2] },
      { to: 'balcony', label: '➔ Mở cửa ra Ban Công', pos: [-0.2, 1.1, -4.0] }
    ]
  },
  balcony: {
    id: 'balcony',
    name: 'Ban Công',
    center: [4, 1.7, -3.6],
    defaultYaw: -2.0,
    lightPos: [1.2, 2.8, -4],
    switchPos: [0.3, 1.45, -2.5],
    badgePos: [4, 2.9, -4],
    lightKey: 'light_balcony',
    toggleMethod: 'setBalcony',
    portals: [
      { to: 'bedroom', label: '➔ Vào Phòng Ngủ', pos: [0.2, 1.1, -4.0] },
      { to: 'kitchen', label: '➔ Vào Phòng Bếp', pos: [4.0, 1.1, -0.2] }
    ]
  },
  living: {
    id: 'living',
    name: 'Phòng Khách',
    center: [-3.8, 1.7, 4.2],
    defaultYaw: 0.6,
    lightPos: [-4, 3.35, 4],
    switchPos: [-0.3, 1.45, 1.6],
    badgePos: [-4, 2.9, 4],
    lightKey: 'light_living',
    toggleMethod: 'setLiving',
    portals: [
      { to: 'bedroom', label: '➔ Bước vào Phòng Ngủ', pos: [-2.0, 1.1, 0.2] },
      { to: 'kitchen', label: '➔ Bước sang Phòng Bếp', pos: [-0.2, 1.1, 4.0] }
    ]
  },
  kitchen: {
    id: 'kitchen',
    name: 'Phòng Bếp',
    center: [3.5, 1.7, 3.8],
    defaultYaw: 2.3,
    lightPos: [4, 3.35, 4],
    switchPos: [0.3, 1.45, 1.6],
    badgePos: [4, 2.9, 4],
    lightKey: 'light_kitchen',
    toggleMethod: 'setKitchen',
    portals: [
      { to: 'living', label: '➔ Về Phòng Khách', pos: [0.2, 1.1, 4.0] },
      { to: 'balcony', label: '➔ Ra Ban Công thoáng gió', pos: [4.0, 1.1, 0.2] }
    ]
  }
};

// =========================================================================
// 1. HELPER GENERATE PROCEDURAL HIGH-RESOLUTION CANVAS TEXTURES (ARCHVIZ)
// =========================================================================

// Sàn gỗ sồi / óc chó cao cấp với vân gỗ tự nhiên và mạch ghép
function createWoodFloorTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  // Nền gỗ ấm
  ctx.fillStyle = '#6d4327';
  ctx.fillRect(0, 0, 512, 512);

  const numPlanks = 8;
  const plankH = 512 / numPlanks;
  for (let i = 0; i < numPlanks; i++) {
    const y = i * plankH;
    ctx.fillStyle = i % 2 === 0 ? '#784a2b' : '#613b21';
    ctx.fillRect(0, y, 512, plankH - 2);

    // Vân gỗ gợn sóng
    ctx.strokeStyle = 'rgba(35, 18, 8, 0.22)';
    ctx.lineWidth = 1.2;
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      const gy = y + 4 + k * (plankH / 5);
      ctx.moveTo(0, gy);
      ctx.bezierCurveTo(150, gy + (k % 2 === 0 ? 3 : -3), 350, gy + (k % 2 === 0 ? -3 : 3), 512, gy);
      ctx.stroke();
    }

    // Đường chỉ rãnh ghép ván gỗ
    ctx.fillStyle = '#26140a';
    ctx.fillRect(0, y + plankH - 2, 512, 2);

    // Mối nối dọc so le
    const splitX = ((i * 180) + 70) % 512;
    ctx.fillRect(splitX, y, 2, plankH);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.anisotropy = 16;
  return texture;
}

// Sàn đá cẩm thạch / gạch men bóng cao cấp cho Phòng Bếp
function createMarbleTileTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 512);

  const tileSize = 128;
  for (let x = 0; x < 512; x += tileSize) {
    for (let y = 0; y < 512; y += tileSize) {
      ctx.fillStyle = (x + y) % (tileSize * 2) === 0 ? '#e2e8f0' : '#f1f5f9';
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
  }

  // Vân đá cẩm thạch mềm mại
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.28)';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    const sx = (i * 90) % 512;
    ctx.moveTo(sx, 0);
    ctx.bezierCurveTo(sx + 60, 160, sx - 40, 360, sx + 100, 512);
    ctx.stroke();
  }

  // Mạch gạch sắc nét
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0); ctx.lineTo(i, 512);
    ctx.moveTo(0, i); ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 16;
  return texture;
}

// Sàn nan gỗ Teak ngoài trời cho Ban Công
function createTeakDeckTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#170f09'; // Khe giãn nở đen
  ctx.fillRect(0, 0, 512, 512);

  const numSlats = 14;
  const slatW = 512 / numSlats;
  for (let i = 0; i < numSlats; i++) {
    const x = i * slatW;
    ctx.fillStyle = i % 2 === 0 ? '#8c532b' : '#794521';
    ctx.fillRect(x + 2, 0, slatW - 4, 512);

    ctx.strokeStyle = 'rgba(30, 15, 6, 0.18)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + slatW / 2, 0);
    ctx.lineTo(x + slatW / 2 + (i % 3 === 0 ? 3 : -3), 512);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.anisotropy = 16;
  return texture;
}

// Thảm dệt sợi tự nhiên cao cấp với hoa văn viền
function createRugTexture(bgColor = '#1e293b', borderColor = '#0284c7') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, 512, 512);

  // Viền chỉ đôi
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 14;
  ctx.strokeRect(18, 18, 476, 476);
  ctx.lineWidth = 4;
  ctx.strokeRect(38, 38, 436, 436);

  // Vân dệt quả trám
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 2;
  for (let x = 60; x <= 450; x += 36) {
    for (let y = 60; y <= 450; y += 36) {
      ctx.strokeRect(x, y, 24, 24);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Màn hình Smart TV OLED hiển thị Dashboard / Wallpaper sống động
function createTVScreenTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 280;
  const ctx = canvas.getContext('2d');

  // Nền vũ trụ công nghệ
  const grad = ctx.createLinearGradient(0, 0, 512, 280);
  grad.addColorStop(0, '#020617');
  grad.addColorStop(0.5, '#0c4a6e');
  grad.addColorStop(1, '#0369a1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 280);

  // Đồng hồ & Trạng thái Digital Twin
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px monospace';
  ctx.fillText('20:45', 30, 60);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px sans-serif';
  ctx.fillText('SMART TWIN AMBIENT OS', 30, 95);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.font = '14px sans-serif';
  ctx.fillText('Nhiệt độ 27.5°C • Độ ẩm 66% • IoT Connected', 30, 125);

  // Sóng biểu đồ năng lượng
  ctx.strokeStyle = '#34d399';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(30, 210);
  ctx.bezierCurveTo(120, 160, 240, 240, 360, 180);
  ctx.lineTo(480, 220);
  ctx.stroke();

  // Khung widget nổi
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
  ctx.strokeRect(330, 30, 150, 95);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('⚡ Năng lượng: 1.2kW', 345, 65);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('● 4 Đèn • 1 Quạt Active', 345, 95);

  const texture = new THREE.CanvasTexture(canvas);
  texture.anisotropy = 16;
  return texture;
}

// Tranh sơn dầu hiện đại trừu tượng
function createAbstractArtTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 360;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 360);

  // Vệt sơn vàng kim & xanh ngọc nghệ thuật
  ctx.fillStyle = '#d97706';
  ctx.beginPath();
  ctx.ellipse(180, 180, 120, 70, Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#0284c7';
  ctx.beginPath();
  ctx.ellipse(320, 180, 110, 80, -Math.PI / 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fde047';
  ctx.fillRect(200, 120, 90, 8);
  ctx.fillRect(170, 220, 140, 6);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(256, 180, 95, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(canvas);
}

// =========================================================================
// 2. BỘ ĐIỀU KHIỂN CAMERA FIRST-PERSON 360° & ORBIT INTERPOLATION (CAMERA RIG)
// =========================================================================
function CameraRig({ viewMode, setViewMode, autoRotate }) {
  const { camera, gl } = useThree();
  const controlsRef = useRef();

  const isFirstPerson = !!ROOM_CONFIG[viewMode];
  const fpYaw = useRef(ROOM_CONFIG[viewMode]?.defaultYaw || 0);
  const fpPitch = useRef(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (ROOM_CONFIG[viewMode]) {
      fpYaw.current = ROOM_CONFIG[viewMode].defaultYaw;
      fpPitch.current = 0;
    } else if (viewMode === 'overview') {
      camera.position.set(16, 18, 16);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0.8, 0);
        controlsRef.current.update();
      }
    } else if (viewMode === 'top') {
      camera.position.set(0.01, 26, 0.01);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [viewMode, camera]);

  useEffect(() => {
    const dom = gl.domElement;

    const handlePointerDown = (e) => {
      if (e.target !== dom) return;
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      if (isFirstPerson) dom.style.cursor = 'grabbing';
    };

    const handlePointerMove = (e) => {
      if (!isDragging.current || !isFirstPerson) return;
      const dx = e.clientX - lastPointer.current.x;
      const dy = e.clientY - lastPointer.current.y;
      lastPointer.current = { x: e.clientX, y: e.clientY };

      fpYaw.current -= dx * 0.0035;
      const newPitch = fpPitch.current - dy * 0.0028;
      fpPitch.current = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, newPitch));
    };

    const handlePointerUp = () => {
      isDragging.current = false;
      if (isFirstPerson) dom.style.cursor = 'grab';
    };

    dom.style.cursor = isFirstPerson ? 'grab' : 'default';

    dom.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      dom.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [gl, isFirstPerson]);

  useFrame((_, delta) => {
    if (isFirstPerson) {
      const room = ROOM_CONFIG[viewMode];
      if (room) {
        const targetPos = new THREE.Vector3(...room.center);
        camera.position.lerp(targetPos, Math.min(1, delta * 4.5));

        const yaw = fpYaw.current;
        const pitch = fpPitch.current;
        const dirX = Math.sin(yaw) * Math.cos(pitch);
        const dirY = Math.sin(pitch);
        const dirZ = Math.cos(yaw) * Math.cos(pitch);

        const lookTarget = new THREE.Vector3(
          camera.position.x + dirX,
          camera.position.y + dirY,
          camera.position.z + dirZ
        );
        camera.lookAt(lookTarget);
      }
    } else if (viewMode === 'top') {
      const targetPos = new THREE.Vector3(0.01, 26, 0.01);
      camera.position.lerp(targetPos, Math.min(1, delta * 3.5));
      if (controlsRef.current) {
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), Math.min(1, delta * 3.5));
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enabled={!isFirstPerson}
      autoRotate={autoRotate && !isFirstPerson}
      autoRotateSpeed={1.0}
      enableRotate={!isFirstPerson}
      enableZoom={!isFirstPerson}
      maxPolarAngle={viewMode === 'top' ? Math.PI : Math.PI / 2.15}
      minDistance={6}
      maxDistance={42}
      target={[0, 0.8, 0]}
    />
  );
}

// =========================================================================
// 3. ĐÈN VÒNG HALO HIỆN ĐẠI & CHIẾU SÁNG KIẾN TRÚC THỰC TẾ
// =========================================================================
function HaloCeilingChandelier({ position, isLit, label, onClick }) {
  return (
    <group position={position}>
      {/* Đế gắn trần tròn kim loại đen */}
      <mesh position={[0, 0.08, 0]} castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.05, 24]} />
        <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Dây treo thanh mảnh */}
      {[-0.32, 0.32].map((x, i) => (
        <mesh key={i} position={[x, -0.15, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.4, 8]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} />
        </mesh>
      ))}

      {/* Vòng đèn Halo Ring sang trọng */}
      <mesh
        position={[0, -0.35, 0]}
        rotation={[Math.PI / 2, 0, 0]}
        onClick={onClick}
        style={{ cursor: 'pointer' }}
      >
        <torusGeometry args={[0.55, 0.04, 16, 48]} />
        <meshStandardMaterial
          color={isLit ? '#ffffff' : '#334155'}
          emissive={isLit ? '#fef08a' : '#000000'}
          emissiveIntensity={isLit ? 3.5 : 0}
          roughness={0.15}
          metalness={0.3}
        />
      </mesh>

      {/* Nguồn sáng PointLight ấm áp và SpotLight chiếu rọi sàn khi BẬT */}
      {isLit && (
        <>
          <pointLight
            position={[0, -0.4, 0]}
            color="#fffbeb"
            intensity={5.5}
            distance={12}
            decay={1.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <spotLight
            position={[0, -0.35, 0]}
            target-position={[position[0], 0, position[2]]}
            color="#fef08a"
            intensity={3.0}
            angle={0.95}
            penumbra={0.6}
            distance={9}
          />
          {/* Vầng hào quang tán xạ quanh trần */}
          <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.25, 1.2, 32]} />
            <meshBasicMaterial
              color="#fef08a"
              transparent
              opacity={0.12}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

// =========================================================================
// 4. KHUNG CỬA LƯU THÔNG RỖNG & CÁNH CỬA GỖ MỞ HÉ 75 ĐỘ (OPEN WALK-THROUGH)
// =========================================================================
function OpenDoorwayFrame({ position, rotation = [0, 0, 0], doorSwing = 1.3 }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Khuôn cửa gỗ dày dặn (Nẹp trái, Nẹp phải, Lanh-tô trên) */}
      {/* Nẹp trái */}
      <mesh position={[-0.72, 1.2, 0]} castShadow>
        <boxGeometry args={[0.08, 2.4, 0.24]} />
        <meshStandardMaterial color="#451a03" roughness={0.4} />
      </mesh>
      {/* Nẹp phải */}
      <mesh position={[0.72, 1.2, 0]} castShadow>
        <boxGeometry args={[0.08, 2.4, 0.24]} />
        <meshStandardMaterial color="#451a03" roughness={0.4} />
      </mesh>
      {/* Lanh-tô trên */}
      <mesh position={[0, 2.42, 0]} castShadow>
        <boxGeometry args={[1.52, 0.1, 0.24]} />
        <meshStandardMaterial color="#451a03" roughness={0.4} />
      </mesh>

      {/* Cánh cửa gỗ pano mở xoay 75 độ tạo lối đi thông suốt */}
      <group position={[-0.68, 0, 0]} rotation={[0, doorSwing, 0]}>
        <mesh position={[0.55, 1.18, 0]} castShadow>
          <boxGeometry args={[1.1, 2.34, 0.05]} />
          <meshStandardMaterial color="#5c2d12" roughness={0.35} metalness={0.1} />
        </mesh>
        {/* Pano dập nổi trang trí trên cửa */}
        <mesh position={[0.55, 1.6, 0.028]}>
          <boxGeometry args={[0.85, 0.8, 0.012]} />
          <meshStandardMaterial color="#451a03" roughness={0.4} />
        </mesh>
        <mesh position={[0.55, 0.7, 0.028]}>
          <boxGeometry args={[0.85, 0.8, 0.012]} />
          <meshStandardMaterial color="#451a03" roughness={0.4} />
        </mesh>
        {/* Tay nắm cửa inox mạ bạc sang trọng */}
        <mesh position={[0.98, 1.05, 0.045]}>
          <boxGeometry args={[0.04, 0.14, 0.03]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>
        <mesh position={[0.94, 1.08, 0.07]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12, 12]} rotation={[0, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================================
// 5. CÔNG TẮC GẮN TƯỜNG & THẺ THÔNG BÁO TƯƠNG TÁC
// =========================================================================
function WallSwitchHotspot({
  position,
  rotation = [0, 0, 0],
  isLit,
  isMismatch,
  roomName,
  onToggle,
  onToggleMismatch,
  showCard = false
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.28, 0.02]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.012]}>
        <boxGeometry args={[0.24, 0.26, 0.006]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} />
      </mesh>
      <mesh
        position={[0, 0, 0.018]}
        onClick={(e) => {
          e.stopPropagation();
          if (onToggle) onToggle();
        }}
        style={{ cursor: 'pointer' }}
      >
        <boxGeometry args={[0.12, 0.12, 0.008]} />
        <meshStandardMaterial
          color={isMismatch ? '#ef4444' : isLit ? '#38bdf8' : '#64748b'}
          emissive={isMismatch ? '#ef4444' : isLit ? '#38bdf8' : '#000000'}
          emissiveIntensity={isMismatch ? 3.5 : isLit ? 2.5 : 0}
        />
      </mesh>

      {showCard && (
        <Html position={[0, 0.16, 0.05]} center distanceFactor={7}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(15, 23, 42, 0.92)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: isMismatch
                ? '1px solid rgba(239, 68, 68, 0.8)'
                : isLit
                ? '1px solid rgba(250, 204, 21, 0.7)'
                : '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '12px',
              padding: '6px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              boxShadow: isMismatch
                ? '0 0 25px rgba(239, 68, 68, 0.5)'
                : '0 8px 24px rgba(0, 0, 0, 0.6)',
              minWidth: '150px',
              whiteSpace: 'nowrap',
              userSelect: 'none'
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggle) onToggle();
              }}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            >
              <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc' }}>
                CÔNG TẮC {roomName.toUpperCase()}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 800,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: isMismatch
                    ? 'rgba(239, 68, 68, 0.35)'
                    : isLit
                    ? 'rgba(234, 179, 8, 0.3)'
                    : 'rgba(255, 255, 255, 0.12)',
                  color: isMismatch ? '#f87171' : isLit ? '#fde047' : '#94a3b8'
                }}
              >
                {isMismatch ? 'MISMATCH' : isLit ? 'ĐANG BẬT' : 'ĐANG TẮT'}
              </span>
            </div>

            <div
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleMismatch) onToggleMismatch();
              }}
              style={{
                fontSize: '9px',
                color: isMismatch ? '#f87171' : '#fca5a5',
                cursor: 'pointer',
                textAlign: 'center',
                paddingTop: '2px',
                borderTop: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              {isMismatch ? '⚠️ Đang lỗi Mismatch (Bấm để xóa)' : 'Bấm nút cơ (Test Mismatch)'}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}

// =========================================================================
// 6. BỘ ĐIỀU NHIỆT SMART THERMOSTAT PHÒNG KHÁCH ([-4.5, 1.85, 0.12])
// =========================================================================
function LivingRoomThermostat({ position, temp, hum }) {
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[0.42, 0.52, 0.03]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0, 0.018]}>
        <boxGeometry args={[0.38, 0.48, 0.005]} />
        <meshStandardMaterial color="#020617" roughness={0.1} />
      </mesh>
      <Html position={[0, 0, 0.025]} transform scale={0.11}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'center',
            color: '#38bdf8',
            userSelect: 'none',
            padding: '6px',
            background: 'rgba(2, 6, 23, 0.85)',
            borderRadius: '8px',
            border: '1px solid rgba(56, 189, 248, 0.3)'
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
            🌡️ {temp}°C
          </div>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginTop: '3px' }}>
            💧 Độ ẩm: {hum}%
          </div>
          <div style={{ fontSize: '9px', color: '#34d399', marginTop: '4px', fontWeight: 700 }}>
            ● DHT11 Real-time IoT
          </div>
        </div>
      </Html>
    </group>
  );
}

// =========================================================================
// 7. QUẠT HÚT MÙI THÔNG MINH 5 CÁNH KHÍ ĐỘNG HỌC (CHUẨN BẢN TRƯỚC - KHÔNG CỤC ĐEN)
// =========================================================================
function SmartExhaustFan({
  position,
  rotation = [Math.PI / 2, 0, 0],
  isFanRunning,
  fanSpeed = 0,
  onToggleFan,
  showControlPad = false
}) {
  const propellerRef = useRef();
  const currentSpeed = useRef(0);
  const vortexRef = useRef();

  useFrame((_, delta) => {
    // 4 Mức tốc độ góc thực tế (rad/s) chuẩn bản trước:
    // Mức 0: 0 rad/s (Dừng)
    // Mức 1: 5.5 rad/s (Êm dịu, thấy rõ 5 cánh quay mượt mà)
    // Mức 2: 15.0 rad/s (Tiêu chuẩn)
    // Mức 3: 36.0 rad/s (Turbo cực đại)
    const speedTargets = [0, 5.5, 15.0, 36.0];
    const target = speedTargets[fanSpeed] !== undefined
      ? speedTargets[fanSpeed]
      : (isFanRunning ? 22.0 : 0);

    const lerp = (a, b, t) => a + (b - a) * t;
    currentSpeed.current = lerp(currentSpeed.current, target, Math.min(1, delta * 3.2));

    if (propellerRef.current && currentSpeed.current > 0.01) {
      propellerRef.current.rotation.y += delta * currentSpeed.current;
    }

    if (vortexRef.current && currentSpeed.current > 0.1) {
      vortexRef.current.rotation.y -= delta * (currentSpeed.current * 1.3);
    }
  });

  const getSpeedLabel = () => {
    switch (fanSpeed) {
      case 1: return 'MỨC 1 (ÊM)';
      case 2: return 'MỨC 2 (VỪA)';
      case 3: return 'MỨC 3 (TURBO)';
      default: return 'ĐANG TẮT';
    }
  };

  const getStatusColor = () => {
    switch (fanSpeed) {
      case 1: return '#10b981'; // Xanh ngọc êm dịu
      case 2: return '#0ea5e9'; // Xanh dương vừa phải
      case 3: return '#f59e0b'; // Cam hổ phách Turbo
      default: return '#64748b'; // Xám khi tắt
    }
  };

  const statusColor = getStatusColor();

  const handleNextSpeed = (e) => {
    if (e) e.stopPropagation();
    const next = (fanSpeed + 1) % 4;
    onToggleFan(next);
  };

  return (
    <group position={position}>
      {/* Cụm quạt 3D xoay ngang 90 độ chuẩn bản trước */}
      <group rotation={rotation}>
        {/* 1. KHUNG VỎ VÀ CHAO KÍNH KHÍ ĐỘNG HỌC HIỆN ĐẠI (CHUẨN BẢN TRƯỚC, KHÔNG HỘP ĐEN) */}
        <group onClick={handleNextSpeed} style={{ cursor: 'pointer' }}>
          {/* Ống dẫn khí inox tròn vươn kịch trần */}
          <mesh position={[0, 0.55, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.8, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.15} />
          </mesh>

          {/* Khung mô-tơ trên */}
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.12, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Vòm kính cường lực pha lê trong suốt xuyên thấu (Crystal Clear Canopy) */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.44, 0.58, 0.04, 32]} />
            <meshPhysicalMaterial
              color="#bae6fd"
              transparent
              opacity={0.3}
              transmission={0.92}
              roughness={0.05}
              thickness={0.08}
            />
          </mesh>

          {/* Vành kim loại mạ crom sáng bóng bảo vệ ngoài */}
          <mesh position={[0, 0.08, 0]}>
            <torusGeometry args={[0.58, 0.015, 16, 40]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.92} roughness={0.15} />
          </mesh>

          {/* Vành đèn Neon LED thông minh báo trạng thái cấp độ */}
          <mesh position={[0, 0.06, 0]}>
            <torusGeometry args={[0.49, 0.012, 16, 40]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={fanSpeed > 0 ? 3.0 : 0.2}
            />
          </mesh>
        </group>

        {/* 2. CỤM TRỤC QUAY & 5 CÁNH QUẠT KHÍ ĐỘNG HỌC THỰC THỤ */}
        <group ref={propellerRef} position={[0, 0, 0]} onClick={handleNextSpeed} style={{ cursor: 'pointer' }}>
          {/* Trục quay trung tâm (Spinner Hub mạ kim loại) */}
          <mesh castShadow>
            <cylinderGeometry args={[0.1, 0.1, 0.08, 24]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.1} />
          </mesh>
          <mesh position={[0, -0.045, 0]} castShadow>
            <sphereGeometry args={[0.1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Đèn LED tâm trục phát sáng theo cấp độ gió */}
          <mesh position={[0, -0.095, 0]}>
            <sphereGeometry args={[0.035, 16, 16]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={fanSpeed > 0 ? 3.5 : 0}
            />
          </mesh>

          {/* 5 CÁNH QUẠT THIẾT KẾ KHÍ ĐỘNG HỌC (RÕ RÀNG TỪNG CÁNH) */}
          {[0, 1, 2, 3, 4].map((i) => {
            const angle = (i * 2 * Math.PI) / 5;
            return (
              <group key={i} rotation={[0, angle, 0]}>
                {/* Cuống cánh quạt mạ Crom */}
                <mesh position={[0.1, 0, 0]} castShadow>
                  <cylinderGeometry args={[0.014, 0.016, 0.12, 12]} rotation={[0, 0, Math.PI / 2]} />
                  <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.1} />
                </mesh>

                {/* Thân cánh quạt vát cong theo góc nghiêng khí động học (Pitch) */}
                <group position={[0.27, 0, 0]} rotation={[0.34, 0, 0.06]}>
                  {/* Bản cánh quạt chính */}
                  <RoundedBox args={[0.24, 0.012, 0.11]} radius={0.02} smoothness={3} castShadow>
                    <meshStandardMaterial
                      color={fanSpeed > 0 ? '#0284c7' : '#475569'}
                      metalness={0.7}
                      roughness={0.25}
                    />
                  </RoundedBox>

                  {/* Phần vát thuôn nhọn ở đầu cánh (Winglet) */}
                  <mesh position={[0.125, 0, 0.01]} rotation={[0, 0.25, 0]} castShadow>
                    <boxGeometry args={[0.05, 0.01, 0.08]} />
                    <meshStandardMaterial
                      color={fanSpeed > 0 ? '#38bdf8' : '#64748b'}
                      metalness={0.8}
                      roughness={0.2}
                    />
                  </mesh>

                  {/* Vạch dạ quang thể thao trên đầu cánh quạt */}
                  <mesh position={[0.155, 0, 0.01]}>
                    <boxGeometry args={[0.012, 0.015, 0.075]} />
                    <meshStandardMaterial
                      color={statusColor}
                      emissive={statusColor}
                      emissiveIntensity={fanSpeed > 0 ? 3.0 : 0}
                    />
                  </mesh>
                </group>
              </group>
            );
          })}
        </group>

        {/* 3. HIỆU ỨNG LUỒNG XOÁY KHÔNG KHÍ KHÍ ĐỘNG HỌC (3D AIRFLOW VORTEX) */}
        {fanSpeed > 0 && (
          <group ref={vortexRef} position={[0, -0.32, 0]}>
            <mesh>
              <cylinderGeometry args={[0.14, 0.44, 0.52, 24, 1, true]} />
              <meshBasicMaterial
                color={fanSpeed === 3 ? '#38bdf8' : '#7dd3fc'}
                transparent
                opacity={fanSpeed === 3 ? 0.25 : fanSpeed === 2 ? 0.16 : 0.09}
                side={2}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
              <ringGeometry args={[0.16, 0.42, 24]} />
              <meshBasicMaterial
                color="#38bdf8"
                transparent
                opacity={fanSpeed === 3 ? 0.35 : 0.18}
                side={2}
                depthWrite={false}
              />
            </mesh>
          </group>
        )}
      </group>

      {/* 4. BADGE NÚT ĐIỀU KHIỂN DẠNG PILL CHUẨN BẢN TRƯỚC (Y HỆT ẢNH 1 & 2) */}
      <Html position={[0, 0.52, 0.1]} center distanceFactor={7}>
        <div
          onClick={handleNextSpeed}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            background: fanSpeed > 0 ? 'rgba(14, 165, 233, 0.35)' : 'rgba(15, 23, 42, 0.88)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: fanSpeed > 0 ? `1px solid ${statusColor}` : '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '24px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: fanSpeed > 0 ? `0 0 18px ${statusColor}77` : '0 4px 14px rgba(0, 0, 0, 0.5)',
            transition: 'all 0.25s ease',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
          title="Click để đổi cấp độ quạt (0 -> 1 -> 2 -> 3 -> 0)"
        >
          <span
            style={{
              display: 'inline-block',
              animation: fanSpeed > 0 ? `spin ${2.2 / fanSpeed}s linear infinite` : 'none'
            }}
          >
            🌪️
          </span>
          <span style={{ letterSpacing: '0.5px' }}>QUẠT BẾP</span>
          <span
            style={{
              fontSize: '9px',
              padding: '2px 8px',
              background: fanSpeed > 0 ? statusColor : 'rgba(255, 255, 255, 0.15)',
              color: fanSpeed === 3 ? '#000000' : '#ffffff',
              borderRadius: '10px',
              fontWeight: 800
            }}
          >
            {getSpeedLabel()}
          </span>
        </div>
      </Html>

      {/* 5. NÚT CHỌN 4 CẤP ĐỘ NHANH KHI ĐỨNG TRONG BẾP (FIRST PERSON) */}
      {showControlPad && (
        <Html position={[0, -0.62, 0.1]} center distanceFactor={6.5}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(15, 23, 42, 0.94)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: fanSpeed > 0 ? `1px solid ${statusColor}` : '1px solid rgba(255, 255, 255, 0.18)',
              borderRadius: '14px',
              padding: '6px 10px',
              display: 'flex',
              gap: '4px',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.6)',
              userSelect: 'none'
            }}
          >
            {[
              { lvl: 0, label: 'Tắt' },
              { lvl: 1, label: 'Mức 1' },
              { lvl: 2, label: 'Mức 2' },
              { lvl: 3, label: 'Turbo' }
            ].map((item) => {
              const isSelected = fanSpeed === item.lvl;
              return (
                <button
                  key={item.lvl}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFan(item.lvl);
                  }}
                  style={{
                    padding: '4px 7px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                    backgroundColor: isSelected ? '#0284c7' : 'rgba(30, 41, 59, 0.7)',
                    color: isSelected ? '#ffffff' : '#94a3b8',
                    fontSize: '10px',
                    fontWeight: isSelected ? 800 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </Html>
      )}
    </group>
  );
}

// =========================================================================
// 8. NỘI THẤT LUXURY ARCHVIZ 4 PHÒNG (8x8 UNITS MỖI PHÒNG, TỔNG 16x16)
// =========================================================================

// --- 1. PHÒNG KHÁCH (LIVING ROOM: X [-8, 0], Z [0, 8]) ---
function LivingRoomArchViz({ rugTex, tvTex, artTex }) {
  return (
    <group>
      {/* Thảm dệt sợi họa tiết quả trám */}
      <mesh position={[-4.5, 0.02, 4.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[4.4, 3.4]} />
        <meshStandardMaterial map={rugTex} roughness={0.9} />
      </mesh>

      {/* Vách ốp lam gỗ tiêu âm sau TV (Vertical Acoustic Wood Slats) */}
      <group position={[-7.9, 1.75, 4.2]}>
        <mesh position={[-0.04, 0, 0]}>
          <boxGeometry args={[0.02, 3.2, 3.8]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.9} />
        </mesh>
        {/* 24 thanh nan gỗ dọc tự nhiên */}
        {Array.from({ length: 24 }).map((_, idx) => (
          <mesh key={idx} position={[0, 0, -1.8 + idx * 0.155]}>
            <boxGeometry args={[0.04, 3.2, 0.08]} />
            <meshStandardMaterial color="#854d0e" roughness={0.4} />
          </mesh>
        ))}
        {/* Dải LED hắt sáng tường ấm cúng (Warm Amber LED Cove Light) */}
        <mesh position={[0.02, 0, -1.9]}>
          <boxGeometry args={[0.02, 3.1, 0.02]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
        <mesh position={[0.02, 0, 1.9]}>
          <boxGeometry args={[0.02, 3.1, 0.02]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Kệ TV treo tường & TV OLED viền siêu mỏng */}
      <group position={[-7.65, 0, 4.2]}>
        <RoundedBox args={[0.45, 0.38, 3.4]} radius={0.03} smoothness={3} position={[0, 0.28, 0]} castShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.2} />
        </RoundedBox>
        {/* Màn hình TV OLED phẳng sát nan gỗ */}
        <mesh position={[0.04, 1.35, 0]} castShadow>
          <boxGeometry args={[0.04, 1.25, 2.3]} />
          <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
        </mesh>
        {/* Màn hình phát nội dung Smart Home Dashboard phát sáng rực rỡ */}
        <mesh position={[0.065, 1.35, 0]}>
          <boxGeometry args={[0.005, 1.18, 2.22]} />
          <meshStandardMaterial
            map={tvTex}
            emissive="#0284c7"
            emissiveIntensity={0.65}
            roughness={0.2}
          />
        </mesh>
        {/* Soundbar rạp hát */}
        <RoundedBox args={[0.12, 0.07, 1.5]} radius={0.02} smoothness={2} position={[0.08, 0.52, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </RoundedBox>
      </group>

      {/* Sofa góc chữ L cao cấp với đệm rời, tựa lưng & gối nhấn */}
      <group position={[-3.2, 0, 4.2]}>
        {/* Khung đế sofa chân kim loại đen */}
        <RoundedBox args={[1.3, 0.22, 3.2]} radius={0.04} smoothness={3} position={[0, 0.15, 0]} castShadow>
          <meshStandardMaterial color="#090d16" metalness={0.8} />
        </RoundedBox>
        {/* 3 Đệm ngồi riêng biệt */}
        {[-0.95, 0, 0.95].map((z, i) => (
          <RoundedBox key={i} args={[1.15, 0.26, 0.98]} radius={0.06} smoothness={4} position={[-0.05, 0.38, z]} castShadow receiveShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </RoundedBox>
        ))}
        {/* Góc L nối dài */}
        <RoundedBox args={[1.6, 0.26, 1.2]} radius={0.06} smoothness={4} position={[-1.1, 0.38, 1.0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </RoundedBox>
        {/* Tựa lưng dày dặn */}
        <RoundedBox args={[0.26, 0.55, 3.2]} radius={0.06} smoothness={3} position={[0.55, 0.65, 0]} castShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </RoundedBox>
        {/* Gối tựa lưng vàng mù tạt & xanh đại dương */}
        <RoundedBox args={[0.18, 0.38, 0.5]} radius={0.04} smoothness={3} position={[0.35, 0.62, -0.7]} rotation={[0, 0.15, -0.1]}>
          <meshStandardMaterial color="#eab308" roughness={0.6} />
        </RoundedBox>
        <RoundedBox args={[0.18, 0.38, 0.5]} radius={0.04} smoothness={3} position={[0.35, 0.62, 0.3]} rotation={[0, -0.15, -0.1]}>
          <meshStandardMaterial color="#0284c7" roughness={0.6} />
        </RoundedBox>
      </group>

      {/* Bàn trà 2 tầng: Kính đen khói + Tầng gỗ óc chó */}
      <group position={[-5.0, 0, 4.2]}>
        {/* Tầng đáy gỗ óc chó */}
        <RoundedBox args={[1.4, 0.05, 0.85]} radius={0.02} smoothness={3} position={[0, 0.16, 0]} castShadow>
          <meshStandardMaterial color="#5c381e" roughness={0.4} />
        </RoundedBox>
        {/* Chân kim loại */}
        {[-0.62, 0.62].map((x, i) =>
          [-0.34, 0.34].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.22, z]}>
              <cylinderGeometry args={[0.018, 0.018, 0.44, 12]} />
              <meshStandardMaterial color="#090d16" metalness={0.95} />
            </mesh>
          ))
        )}
        {/* Mặt bàn kính khói cường lực */}
        <RoundedBox args={[1.44, 0.025, 0.9]} radius={0.03} smoothness={3} position={[0, 0.44, 0]} castShadow>
          <meshPhysicalMaterial
            color="#334155"
            transmission={0.8}
            opacity={0.65}
            transparent
            roughness={0.05}
          />
        </RoundedBox>
        {/* Cuốn sách trang trí & ly sứ */}
        <mesh position={[-0.2, 0.47, 0.1]}>
          <boxGeometry args={[0.26, 0.04, 0.35]} />
          <meshStandardMaterial color="#d97706" />
        </mesh>
      </group>

      {/* Tranh canvas nghệ thuật trừu tượng trên tường phòng khách */}
      <group position={[-2.8, 2.1, 7.85]}>
        <mesh castShadow>
          <boxGeometry args={[1.8, 1.2, 0.04]} />
          <meshStandardMaterial map={artTex} />
        </mesh>
        <mesh position={[0, 0, -0.01]}>
          <boxGeometry args={[1.86, 1.26, 0.02]} />
          <meshStandardMaterial color="#d97706" metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Đèn cây đứng góc phòng (Floor Lamp) phát ánh sáng ấm */}
      <group position={[-7.1, 0, 7.1]}>
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.25, 0.28, 0.06, 24]} />
          <meshStandardMaterial color="#0f172a" metalness={0.9} />
        </mesh>
        <mesh position={[0, 1.0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 1.9, 12]} />
          <meshStandardMaterial color="#d97706" metalness={0.9} />
        </mesh>
        <mesh position={[0, 1.85, 0]}>
          <cylinderGeometry args={[0.26, 0.36, 0.45, 24]} />
          <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.8} />
        </mesh>
        <pointLight position={[0, 1.8, 0]} color="#fef08a" intensity={1.8} distance={4} />
      </group>
    </group>
  );
}

// --- 2. PHÒNG NGỦ (BEDROOM: X [-8, 0], Z [-8, 0]) ---
function BedroomArchViz({ rugTex, artTex }) {
  return (
    <group>
      {/* Thảm dệt êm chân dưới giường */}
      <mesh position={[-4.2, 0.02, -4.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[3.8, 3.8]} />
        <meshStandardMaterial map={rugTex} roughness={0.9} />
      </mesh>

      {/* Vách ốp đầu giường kết hợp nan gỗ dọc sang trọng */}
      <group position={[-4.2, 1.8, -7.9]}>
        {/* Nền đệm nỉ xám */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[3.6, 2.8, 0.06]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Nan gỗ nhấn 2 bên */}
        {[-1.6, 1.6].map((gx, i) => (
          <group key={i} position={[gx, 0, 0.04]}>
            {[-0.2, -0.07, 0.07, 0.2].map((sx, j) => (
              <mesh key={j} position={[sx, 0, 0]}>
                <boxGeometry args={[0.045, 2.7, 0.03]} />
                <meshStandardMaterial color="#854d0e" roughness={0.4} />
              </mesh>
            ))}
          </group>
        ))}
        {/* Dải LED hắt sáng đầu giường (Underglow / Headboard LED) */}
        <mesh position={[0, 1.35, 0.04]}>
          <boxGeometry args={[3.4, 0.025, 0.02]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.85} />
        </mesh>
      </group>

      {/* Giường đôi bọc nệm nỉ với đèn LED hắt gầm giường (Floating Bed) */}
      <group position={[-4.2, 0, -4.8]}>
        {/* Đèn LED hắt gầm giường */}
        <mesh position={[0, 0.04, 0]}>
          <boxGeometry args={[2.4, 0.02, 2.6]} />
          <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.7} />
        </mesh>
        {/* Khung giường gỗ sồi */}
        <RoundedBox args={[2.5, 0.34, 2.7]} radius={0.05} smoothness={3} position={[0, 0.18, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#451a03" roughness={0.5} />
        </RoundedBox>
        {/* Nệm trắng cao cấp */}
        <RoundedBox args={[2.32, 0.28, 2.5]} radius={0.05} smoothness={4} position={[0, 0.44, 0.05]} castShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </RoundedBox>
        {/* Chăn phủ màu xanh hoàng gia */}
        <RoundedBox args={[2.34, 0.14, 1.6]} radius={0.05} smoothness={3} position={[0, 0.56, 0.5]} castShadow>
          <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
        </RoundedBox>
        {/* Khăn vắt cuối giường màu be */}
        <RoundedBox args={[2.36, 0.05, 0.5]} radius={0.02} smoothness={2} position={[0, 0.65, 1.05]}>
          <meshStandardMaterial color="#d4b996" roughness={0.8} />
        </RoundedBox>
        {/* 4 Chiếc gối xếp 2 tầng êm ái */}
        {[-0.65, 0.65].map((x, i) => (
          <group key={i}>
            <RoundedBox args={[0.75, 0.16, 0.48]} radius={0.05} smoothness={3} position={[x, 0.65, -0.9]} rotation={[0.2, 0, 0]}>
              <meshStandardMaterial color="#ffffff" roughness={0.9} />
            </RoundedBox>
            <RoundedBox args={[0.65, 0.14, 0.4]} radius={0.04} smoothness={3} position={[x, 0.72, -0.6]} rotation={[0.35, 0, 0]}>
              <meshStandardMaterial color="#38bdf8" roughness={0.8} />
            </RoundedBox>
          </group>
        ))}
      </group>

      {/* 2 Tab đầu giường có đèn ngủ trụ tròn phát sáng */}
      {[-6.0, -2.4].map((x, i) => (
        <group key={i} position={[x, 0, -6.6]}>
          <RoundedBox args={[0.62, 0.48, 0.55]} radius={0.04} smoothness={3} position={[0, 0.24, 0]} castShadow>
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
          </RoundedBox>
          {/* Đèn ngủ thân gốm + chao đèn trụ tròn ấm áp */}
          <mesh position={[0, 0.54, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 0.16, 16]} />
            <meshStandardMaterial color="#d97706" metalness={0.8} />
          </mesh>
          <mesh position={[0, 0.72, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.24, 24]} />
            <meshStandardMaterial color="#fef08a" emissive="#f59e0b" emissiveIntensity={0.7} />
          </mesh>
          <pointLight position={[0, 0.72, 0]} color="#fef08a" intensity={0.9} distance={2.5} />
        </group>
      ))}

      {/* Tủ quần áo cánh kính đen khói kịch trần (Floor-to-Ceiling Wardrobe) */}
      <group position={[-7.5, 1.75, -3.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.75, 3.48, 2.8]} />
          <meshStandardMaterial color="#0b0f19" roughness={0.5} />
        </mesh>
        {/* Cánh kính đen khói có tay nắm vàng */}
        <mesh position={[0.39, 0, 0]}>
          <boxGeometry args={[0.02, 3.3, 2.7]} />
          <meshPhysicalMaterial color="#1e293b" transmission={0.65} opacity={0.7} transparent roughness={0.1} />
        </mesh>
        {/* Tay nắm đứng vàng kim */}
        <mesh position={[0.41, 0, -0.1]}>
          <boxGeometry args={[0.02, 1.2, 0.02]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} />
        </mesh>
        <mesh position={[0.41, 0, 0.1]}>
          <boxGeometry args={[0.02, 1.2, 0.02]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.9} />
        </mesh>
      </group>
    </group>
  );
}

// --- 3. PHÒNG BẾP (KITCHEN: X [0, 8], Z [0, 8]) ---
function KitchenArchViz() {
  return (
    <group>
      {/* Hệ tủ bếp dưới & Mặt đá thạch anh đen cao cấp */}
      <group position={[4.2, 0, 6.8]}>
        {/* Thùng tủ dưới màu ghi chì */}
        <RoundedBox args={[4.4, 0.82, 0.85]} radius={0.03} smoothness={3} position={[0, 0.41, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </RoundedBox>
        {/* Mặt đá thạch anh đen bóng */}
        <RoundedBox args={[4.46, 0.08, 0.9]} radius={0.02} smoothness={3} position={[0, 0.85, 0]} castShadow>
          <meshStandardMaterial color="#090d16" roughness={0.15} metalness={0.2} />
        </RoundedBox>

        {/* Bếp từ âm 2 vùng nấu với vòng tròn đỏ rực */}
        <mesh position={[-0.6, 0.9, -0.05]}>
          <boxGeometry args={[0.92, 0.015, 0.55]} />
          <meshStandardMaterial color="#020617" roughness={0.1} metalness={0.8} />
        </mesh>
        {[-0.85, -0.35].map((bx, i) => (
          <mesh key={i} position={[bx, 0.915, -0.05]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.12, 0.16, 24]} />
            <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.85} side={THREE.DoubleSide} />
          </mesh>
        ))}

        {/* Bồn rửa chén inox & Vòi nước cổ ngỗng uốn cong */}
        <mesh position={[1.05, 0.89, -0.05]}>
          <boxGeometry args={[0.8, 0.02, 0.5]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.95} roughness={0.15} />
        </mesh>
        <mesh position={[1.05, 1.15, -0.22]}>
          <cylinderGeometry args={[0.02, 0.02, 0.4, 12]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
        </mesh>

        {/* Tay nắm kim loại ngăn kéo tủ dưới */}
        {[-1.5, -0.5, 0.5, 1.5].map((hx, i) => (
          <mesh key={i} position={[hx, 0.45, -0.44]}>
            <boxGeometry args={[0.35, 0.02, 0.03]} />
            <meshStandardMaterial color="#e2e8f0" metalness={0.95} />
          </mesh>
        ))}
      </group>

      {/* HỆ TỦ BẾP TRÊN HAI BÊN (CHỪA KHOẢNG KHÔNG THOÁNG ĐÃNG CHO QUẠT HÚT MÙI - KHÔNG CỤC ĐEN) */}
      <group position={[4.2, 2.5, 6.8]}>
        {/* Tủ trên bên trái */}
        <group position={[-1.6, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.2, 0.85, 0.42]} />
            <meshStandardMaterial color="#334155" roughness={0.3} />
          </mesh>
          {/* LED ấm hắt dưới tủ trái */}
          <mesh position={[0, -0.43, -0.12]}>
            <boxGeometry args={[1.15, 0.02, 0.05]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
        </group>

        {/* Tủ trên bên phải (khu vực bồn rửa bát) */}
        <group position={[1.2, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[2.0, 0.85, 0.42]} />
            <meshStandardMaterial color="#334155" roughness={0.3} />
          </mesh>
          {/* LED ấm hắt dưới tủ phải */}
          <mesh position={[0, -0.43, -0.12]}>
            <boxGeometry args={[1.95, 0.02, 0.05]} />
            <meshStandardMaterial color="#f59e0b" emissive="#f59e0b" emissiveIntensity={0.8} />
          </mesh>
          <pointLight position={[0, -0.5, -0.12]} color="#fef08a" intensity={1.2} distance={2.8} />
        </group>
      </group>

      {/* Tủ lạnh Smart Refrigerator 2 cánh dung tích lớn */}
      <group position={[7.3, 1.1, 6.8]}>
        <RoundedBox args={[0.88, 2.25, 0.85]} radius={0.04} smoothness={3} castShadow>
          <meshStandardMaterial color="#334155" metalness={0.88} roughness={0.2} />
        </RoundedBox>
        {/* Bảng điều khiển cảm ứng & Khay lấy nước ngoài */}
        <mesh position={[-0.45, 0.25, 0.15]}>
          <boxGeometry args={[0.02, 0.35, 0.25]} />
          <meshStandardMaterial color="#020617" roughness={0.1} />
        </mesh>
        <mesh position={[-0.46, 0.32, 0.15]}>
          <boxGeometry args={[0.005, 0.08, 0.18]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Bàn ăn gỗ tự nhiên & 4 Ghế ăn điêu khắc hiện đại */}
      <group position={[3.6, 0, 2.6]}>
        <RoundedBox args={[1.9, 0.07, 1.15]} radius={0.03} smoothness={3} position={[0, 0.74, 0]} castShadow>
          <meshStandardMaterial color="#854d0e" roughness={0.35} />
        </RoundedBox>
        {[-0.82, 0.82].map((x, i) =>
          [-0.48, 0.48].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.37, z]}>
              <cylinderGeometry args={[0.028, 0.028, 0.74, 10]} />
              <meshStandardMaterial color="#090d16" metalness={0.8} />
            </mesh>
          ))
        )}
        {/* 4 Ghế ăn bọc đệm êm ái */}
        {[
          { pos: [-0.5, 0, -0.85], rot: 0 },
          { pos: [0.5, 0, -0.85], rot: 0 },
          { pos: [-0.5, 0, 0.85], rot: Math.PI },
          { pos: [0.5, 0, 0.85], rot: Math.PI }
        ].map((chair, idx) => (
          <group key={idx} position={chair.pos} rotation={[0, chair.rot, 0]}>
            <RoundedBox args={[0.42, 0.06, 0.42]} radius={0.02} smoothness={2} position={[0, 0.45, 0]} castShadow>
              <meshStandardMaterial color="#1e293b" />
            </RoundedBox>
            <RoundedBox args={[0.42, 0.45, 0.05]} radius={0.02} smoothness={2} position={[0, 0.68, -0.19]} castShadow>
              <meshStandardMaterial color="#0f172a" />
            </RoundedBox>
            {[-0.18, 0.18].map((cx, k) => (
              <mesh key={k} position={[cx, 0.22, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.45, 8]} />
                <meshStandardMaterial color="#090d16" metalness={0.9} />
              </mesh>
            ))}
          </group>
        ))}
      </group>
    </group>
  );
}

// --- 4. BAN CÔNG (BALCONY: X [0, 8], Z [-8, 0]) ---
// Chậu cây cảnh Monstera / Cọ nhiều tầng lá thực thụ (Xóa bỏ hình cầu tròn đơn điệu)
function DetailedPlantPot({ position, scale = 1.0 }) {
  return (
    <group position={position} scale={scale}>
      {/* Chậu đất nung Terracotta cao cấp */}
      <mesh position={[0, 0.35, 0]} castShadow>
        <cylinderGeometry args={[0.32, 0.24, 0.7, 24]} />
        <meshStandardMaterial color="#e2e8f0" roughness={0.3} />
      </mesh>
      {/* Đất mùn trong chậu */}
      <mesh position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.04, 16]} />
        <meshStandardMaterial color="#2d1c10" roughness={0.95} />
      </mesh>
      {/* 8 Phiến lá cọ / Monstera xoè tán nhiều góc độ */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <group key={i} rotation={[0, rad, 0]}>
            {/* Cuống lá mảnh */}
            <mesh position={[0.2, 0.85, 0]} rotation={[0, 0, -0.45]} castShadow>
              <cylinderGeometry args={[0.01, 0.014, 0.45, 8]} />
              <meshStandardMaterial color="#166534" />
            </mesh>
            {/* Tán lá bản rộng rủ nhẹ */}
            <mesh position={[0.42, 1.05, 0]} rotation={[0.2, 0, -0.65]} castShadow>
              <boxGeometry args={[0.45, 0.01, 0.24]} />
              <meshStandardMaterial color={i % 2 === 0 ? '#15803d' : '#16a34a'} roughness={0.5} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function BalconyArchViz() {
  return (
    <group>
      {/* Ghế mây đan ngoài trời (Rattan Outdoor Lounge Armchairs) */}
      <group position={[5.2, 0, -4.5]}>
        <RoundedBox args={[1.1, 0.42, 1.05]} radius={0.06} smoothness={3} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[1.1, 0.52, 0.18]} radius={0.05} smoothness={3} position={[0, 0.62, -0.45]} castShadow>
          <meshStandardMaterial color="#334155" />
        </RoundedBox>
        {/* Đệm ngồi màu kem */}
        <RoundedBox args={[0.95, 0.12, 0.85]} radius={0.04} smoothness={3} position={[0, 0.48, 0]}>
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </RoundedBox>
      </group>

      {/* Bàn trà ngoài trời bằng gỗ Teak tròn */}
      <group position={[3.4, 0, -4.5]}>
        <mesh position={[0, 0.45, 0]} castShadow>
          <cylinderGeometry args={[0.48, 0.48, 0.05, 24]} />
          <meshStandardMaterial color="#784521" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.22, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.45, 12]} />
          <meshStandardMaterial color="#090d16" metalness={0.9} />
        </mesh>
      </group>

      {/* Các chậu cây cảnh Monstera tán lá thật ở các góc */}
      <DetailedPlantPot position={[1.5, 0, -7.0]} scale={1.1} />
      <DetailedPlantPot position={[7.0, 0, -7.0]} scale={1.0} />
      <DetailedPlantPot position={[7.0, 0, -2.5]} scale={1.05} />
      {/* Cây xanh tiền cảnh ban công (Nhìn thấy trong ảnh góc nhìn First-Person) */}
      <DetailedPlantPot position={[2.4, 0, -2.2]} scale={0.95} />

      {/* Cảm biến ánh sáng tự nhiên gắn trên lan can */}
      <group position={[7.8, 1.15, -4.0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.08, 16]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0.05, 0]}>
          <sphereGeometry args={[0.06, 14, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
        </mesh>
      </group>
    </group>
  );
}

// =========================================================================
// 9. NẸP CHÂN TƯỜNG (BASEBOARDS) & NẸP CHỈ TRẦN KIẾN TRÚC
// =========================================================================
function ArchitecturalSkirtingAndTrims() {
  return (
    <group>
      {/* Len chân tường vân gỗ sang trọng dọc các tường bao (y = 0.06) */}
      <mesh position={[-4, 0.06, -7.9]}>
        <boxGeometry args={[8.0, 0.12, 0.04]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-7.9, 0.06, 0]}>
        <boxGeometry args={[0.04, 0.12, 16.0]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      {/* Len tường chữ thập */}
      <mesh position={[-5.35, 0.06, 0.08]}>
        <boxGeometry args={[5.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
      <mesh position={[-0.65, 0.06, 0.08]}>
        <boxGeometry args={[1.3, 0.12, 0.04]} />
        <meshStandardMaterial color="#1e293b" />
      </mesh>
    </group>
  );
}

// =========================================================================
// 10. KIẾN TRÚC TOÀN CẢNH CĂN HỘ 16x16 UNITS & HỆ THỐNG TƯỜNG CẮT NỬA
// =========================================================================
export default function Apartment3D({
  twinData,
  onToggle,
  onToggleMismatch,
  viewMode,
  setViewMode,
  autoRotate
}) {
  const reported = twinData.reported || {};
  const mismatch = twinData.mismatch || {};

  const isFirstPerson = !!ROOM_CONFIG[viewMode];

  // Khởi tạo các Procedural Textures cao cấp một lần duy nhất qua useMemo
  const woodFloorTex = useMemo(() => createWoodFloorTexture(), []);
  const marbleTileTex = useMemo(() => createMarbleTileTexture(), []);
  const teakDeckTex = useMemo(() => createTeakDeckTexture(), []);
  const livingRugTex = useMemo(() => createRugTexture('#1e293b', '#0284c7'), []);
  const bedRugTex = useMemo(() => createRugTexture('#0f172a', '#d97706'), []);
  const tvScreenTex = useMemo(() => createTVScreenTexture(), []);
  const artTex = useMemo(() => createAbstractArtTexture(), []);

  return (
    <>
      {/* 1. Bộ điều khiển Camera linh hoạt theo góc nhìn */}
      <CameraRig
        viewMode={viewMode}
        setViewMode={setViewMode}
        autoRotate={autoRotate}
      />

      {/* 2. Cyber Grid Vô Cực Dưới Chân */}
      <Grid
        renderOrder={-1}
        position={[0, -0.52, 0]}
        infiniteGrid
        cellSize={0.8}
        cellThickness={0.7}
        cellColor="#1e293b"
        sectionSize={4.0}
        sectionThickness={1.4}
        sectionColor="#0284c7"
        fadeDistance={40}
      />

      {/* 3. Hệ thống Ánh Sáng Môi Trường ArchViz */}
      <ambientLight intensity={0.52} />
      <directionalLight
        position={[18, 26, 16]}
        intensity={1.35}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
      />
      <directionalLight position={[-16, 14, -14]} intensity={0.4} color="#38bdf8" />

      {/* ================= KHỐI ĐẾ KIẾN TRÚC (16x16 UNITS FOOTPRINT) ================= */}
      <RoundedBox args={[17.0, 0.5, 17.0]} radius={0.12} smoothness={4} position={[0, -0.25, 0]} receiveShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.2} />
      </RoundedBox>

      {/* ================= MẶT SÀN TỪNG PHÒNG VỚI VÂN GỖ / ĐÁ CAO CẤP ================= */}
      {/* 1. Sàn Gỗ Tự Nhiên Phòng Khách (X: [-8, 0], Z: [0, 8]) */}
      <mesh position={[-4, 0.01, 4]} receiveShadow>
        <boxGeometry args={[7.88, 0.02, 7.88]} />
        <meshStandardMaterial map={woodFloorTex} roughness={0.35} metalness={0.08} />
      </mesh>

      {/* 2. Sàn Gỗ Tự Nhiên Phòng Ngủ (X: [-8, 0], Z: [-8, 0]) */}
      <mesh position={[-4, 0.01, -4]} receiveShadow>
        <boxGeometry args={[7.88, 0.02, 7.88]} />
        <meshStandardMaterial map={woodFloorTex} roughness={0.35} metalness={0.08} />
      </mesh>

      {/* 3. Sàn Đá Marble Sang Trọng Phòng Bếp (X: [0, 8], Z: [0, 8]) */}
      <mesh position={[4, 0.01, 4]} receiveShadow>
        <boxGeometry args={[7.88, 0.02, 7.88]} />
        <meshStandardMaterial map={marbleTileTex} roughness={0.15} metalness={0.1} />
      </mesh>

      {/* 4. Sàn Nan Gỗ Teak Ngoài Trời Ban Công (X: [0, 8], Z: [-8, 0]) */}
      <mesh position={[4, 0.01, -4]} receiveShadow>
        <boxGeometry args={[7.88, 0.02, 7.88]} />
        <meshStandardMaterial map={teakDeckTex} roughness={0.55} />
      </mesh>

      {/* ================= TƯỜNG NGOÀI CỐ ĐỊNH ================= */}
      <mesh position={[-4, 1.75, -8.0]} castShadow receiveShadow>
        <boxGeometry args={[8.0, 3.5, 0.2]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>
      <mesh position={[-8.0, 1.75, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.2, 3.5, 16.0]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </mesh>

      {/* Lan can kính cường lực Ban công ngoài trời */}
      <group>
        <mesh position={[4, 0.55, -8.0]}>
          <boxGeometry args={[8.0, 1.1, 0.05]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            transparent
            opacity={0.35}
            roughness={0.05}
            transmission={0.7}
            thickness={0.15}
          />
        </mesh>
        <mesh position={[4, 1.12, -8.0]}>
          <boxGeometry args={[8.0, 0.05, 0.1]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
        <mesh position={[8.0, 0.55, -4.0]}>
          <boxGeometry args={[0.05, 1.1, 8.0]} />
          <meshPhysicalMaterial
            color="#bae6fd"
            transparent
            opacity={0.35}
            roughness={0.05}
            transmission={0.7}
            thickness={0.15}
          />
        </mesh>
        <mesh position={[8.0, 1.12, -4.0]}>
          <boxGeometry args={[0.1, 0.05, 8.0]} />
          <meshStandardMaterial color="#334155" metalness={0.8} />
        </mesh>
      </group>

      {/* ================= TƯỜNG NGOÀI CẮT NỬA ĐỘNG (FRONT/EAST CUTAWAY WALLS) ================= */}
      <group visible={isFirstPerson}>
        <mesh position={[0, 1.75, 8.0]} castShadow receiveShadow>
          <boxGeometry args={[16.2, 3.5, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[8.0, 1.75, 4.0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 3.5, 8.0]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
      </group>

      {/* ================= HỆ THỐNG TRẦN NHÀ ĐỘNG VỚI ĐÈN DOWNLIGHT ÂM TRẦN ================= */}
      <group visible={isFirstPerson}>
        <mesh position={[-4, 3.52, 4]} receiveShadow>
          <boxGeometry args={[8.0, 0.06, 8.0]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </mesh>
        <mesh position={[-4, 3.52, -4]} receiveShadow>
          <boxGeometry args={[8.0, 0.06, 8.0]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </mesh>
        <mesh position={[4, 3.52, 4]} receiveShadow>
          <boxGeometry args={[8.0, 0.06, 8.0]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.7} />
        </mesh>
        <mesh position={[4, 3.52, -4]} receiveShadow>
          <boxGeometry args={[8.0, 0.06, 8.0]} />
          <meshStandardMaterial color="#334155" roughness={0.5} />
        </mesh>
      </group>

      {/* ================= TƯỜNG CHỮ THẬP TRUNG TÂM & 4 CỬA LƯU THÔNG MỞ HÉ 75 ĐỘ ================= */}
      {/* 1. Tường Z = 0 giữa Phòng Ngủ và Phòng Khách (Cửa mở tại X = -2, Z = 0) */}
      <group>
        <mesh position={[-5.35, 1.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[5.3, 3.5, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[-0.65, 1.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 3.5, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[-2.0, 2.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.1, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <OpenDoorwayFrame position={[-2.0, 0, 0]} rotation={[0, 0, 0]} doorSwing={1.3} />
      </group>

      {/* 2. Tường Z = 0 giữa Bếp và Ban Công (Cửa mở tại X = 4, Z = 0) */}
      <group>
        <mesh position={[1.65, 1.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.3, 3.5, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[6.35, 1.75, 0]} castShadow receiveShadow>
          <boxGeometry args={[3.3, 3.5, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[4.0, 2.95, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.4, 1.1, 0.2]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <OpenDoorwayFrame position={[4.0, 0, 0]} rotation={[0, 0, 0]} doorSwing={-1.3} />
      </group>

      {/* 3. Tường X = 0 giữa Phòng Ngủ và Ban Công (Cửa mở tại X = 0, Z = -4) */}
      <group>
        <mesh position={[0, 1.75, -6.35]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 3.5, 3.3]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.75, -1.65]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 3.5, 3.3]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.95, -4.0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 1.1, 1.4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <OpenDoorwayFrame position={[0, 0, -4.0]} rotation={[0, Math.PI / 2, 0]} doorSwing={1.3} />
      </group>

      {/* 4. Tường X = 0 giữa Phòng Khách và Bếp (Cửa mở tại X = 0, Z = 4) */}
      <group>
        <mesh position={[0, 1.75, 1.65]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 3.5, 3.3]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 1.75, 6.35]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 3.5, 3.3]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <mesh position={[0, 2.95, 4.0]} castShadow receiveShadow>
          <boxGeometry args={[0.2, 1.1, 1.4]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </mesh>
        <OpenDoorwayFrame position={[0, 0, 4.0]} rotation={[0, Math.PI / 2, 0]} doorSwing={-1.3} />
      </group>

      {/* Nẹp chân tường Skirting */}
      <ArchitecturalSkirtingAndTrims />

      {/* ================= KHÔNG GIAN NỘI THẤT LUXURY ARCHVIZ 4 PHÒNG ================= */}
      <LivingRoomArchViz rugTex={livingRugTex} tvTex={tvScreenTex} artTex={artTex} />
      <BedroomArchViz rugTex={bedRugTex} artTex={artTex} />
      <KitchenArchViz />
      <BalconyArchViz />

      {/* ================= THIẾT BỊ GẮN TƯỜNG (THERMOSTAT & RANGE HOOD) ================= */}
      <LivingRoomThermostat
        position={[-4.5, 1.85, 0.12]}
        temp={Number(reported.temperature !== undefined ? reported.temperature : 27.5).toFixed(1)}
        hum={Number(reported.humidity !== undefined ? reported.humidity : 66.0).toFixed(0)}
      />

      {/* QUẠT HÚT THÔNG MINH 5 CÁNH KHÍ ĐỘNG HỌC (CHUẨN BẢN TRƯỚC, KHÔNG CỤC ĐEN, LÙI VỀ BẾP NẤU) */}
      <SmartExhaustFan
        position={[3.6, 2.05, 6.75]}
        rotation={[Math.PI / 2, 0, 0]}
        isFanRunning={reported.fan_kitchen === 1 || (reported.fan_speed && reported.fan_speed > 0)}
        fanSpeed={reported.fan_speed !== undefined ? reported.fan_speed : (reported.fan_kitchen ? 3 : 0)}
        onToggleFan={(lvl) => onToggle('setFan', lvl)}
        showControlPad={viewMode === 'kitchen'}
      />

      {/* ================= HỆ THỐNG ĐÈN CHÙM VÒNG HALO 4 PHÒNG ================= */}
      {/* 1. Đèn Phòng Ngủ: [-4, 3.35, -4] */}
      <HaloCeilingChandelier
        position={ROOM_CONFIG.bedroom.lightPos}
        isLit={reported.light_bed === 1}
        label="PHÒNG NGỦ"
        onClick={() => onToggle('setBed', reported.light_bed !== 1)}
      />

      {/* 2. Đèn Ban Công: [1.2, 2.8, -4] */}
      <HaloCeilingChandelier
        position={ROOM_CONFIG.balcony.lightPos}
        isLit={reported.light_balcony === 1}
        label="BAN CÔNG"
        onClick={() => onToggle('setBalcony', reported.light_balcony !== 1)}
      />

      {/* 3. Đèn Phòng Khách: [-4, 3.35, 4] */}
      <HaloCeilingChandelier
        position={ROOM_CONFIG.living.lightPos}
        isLit={reported.light_living === 1}
        label="PHÒNG KHÁCH"
        onClick={() => onToggle('setLiving', reported.light_living !== 1)}
      />

      {/* 4. Đèn Bếp: [4, 3.35, 4] */}
      <HaloCeilingChandelier
        position={ROOM_CONFIG.kitchen.lightPos}
        isLit={reported.light_kitchen === 1}
        label="BẾP"
        onClick={() => onToggle('setKitchen', reported.light_kitchen !== 1)}
      />

      {/* ================= CÔNG TẮC ĐÈN CẢM ỨNG GẮN TƯỜNG ================= */}
      <WallSwitchHotspot
        position={ROOM_CONFIG.bedroom.switchPos}
        rotation={[0, -Math.PI / 2, 0]}
        isLit={reported.light_bed === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_bed'}
        roomName="Phòng Ngủ"
        onToggle={() => onToggle('setBed', reported.light_bed !== 1)}
        onToggleMismatch={() => onToggleMismatch('light_bed')}
        showCard={viewMode === 'bedroom'}
      />

      <WallSwitchHotspot
        position={ROOM_CONFIG.balcony.switchPos}
        rotation={[0, Math.PI / 2, 0]}
        isLit={reported.light_balcony === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_balcony'}
        roomName="Ban Công"
        onToggle={() => onToggle('setBalcony', reported.light_balcony !== 1)}
        onToggleMismatch={() => onToggleMismatch('light_balcony')}
        showCard={viewMode === 'balcony'}
      />

      <WallSwitchHotspot
        position={ROOM_CONFIG.living.switchPos}
        rotation={[0, -Math.PI / 2, 0]}
        isLit={reported.light_living === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_living'}
        roomName="Phòng Khách"
        onToggle={() => onToggle('setLiving', reported.light_living !== 1)}
        onToggleMismatch={() => onToggleMismatch('light_living')}
        showCard={viewMode === 'living'}
      />

      <WallSwitchHotspot
        position={ROOM_CONFIG.kitchen.switchPos}
        rotation={[0, Math.PI / 2, 0]}
        isLit={reported.light_kitchen === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_kitchen'}
        roomName="Phòng Bếp"
        onToggle={() => onToggle('setKitchen', reported.light_kitchen !== 1)}
        onToggleMismatch={() => onToggleMismatch('light_kitchen')}
        showCard={viewMode === 'kitchen'}
      />

      {/* ================= CỬA ĐIỀU HƯỚNG LIÊN PHÒNG (DOORWAY NAVIGATION PORTALS) ================= */}
      {isFirstPerson &&
        ROOM_CONFIG[viewMode]?.portals.map((portal, idx) => (
          <Html key={idx} position={portal.pos} center distanceFactor={7.5}>
            <div
              onClick={(e) => {
                e.stopPropagation();
                setViewMode(portal.to);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                background: 'linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%)',
                border: '1px solid rgba(255, 255, 255, 0.4)',
                borderRadius: '30px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 0 20px #0284c7, 0 0 35px rgba(2, 132, 199, 0.65)',
                whiteSpace: 'nowrap',
                userSelect: 'none',
                transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
              title={`Nhấp để bước sang ${portal.to}`}
            >
              <span style={{ fontSize: '13px' }}>👣</span>
              <span>{portal.label}</span>
            </div>
          </Html>
        ))}

      {/* ================= HUY HIỆU PHÒNG TRONG CHẾ ĐỘ TOÀN CẢNH (OVERVIEW ROOM BADGES) ================= */}
      {viewMode === 'overview' &&
        Object.values(ROOM_CONFIG).map((room) => {
          const isLit = reported[room.lightKey] === 1;
          return (
            <Html key={room.id} position={room.badgePos} center distanceFactor={14}>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 15px',
                  background: isLit
                    ? 'rgba(234, 179, 8, 0.28)'
                    : 'rgba(15, 23, 42, 0.85)',
                  backdropFilter: 'blur(14px)',
                  WebkitBackdropFilter: 'blur(14px)',
                  border: isLit
                    ? '1px solid rgba(250, 204, 21, 0.85)'
                    : '1px solid rgba(255, 255, 255, 0.18)',
                  borderRadius: '18px',
                  boxShadow: isLit
                    ? '0 0 20px rgba(234, 179, 8, 0.4)'
                    : '0 8px 25px rgba(0, 0, 0, 0.6)',
                  whiteSpace: 'nowrap',
                  userSelect: 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: isLit ? '#facc15' : '#64748b',
                      boxShadow: isLit ? '0 0 8px #facc15' : 'none'
                    }}
                  />
                  <span style={{ fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                    {room.name.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '9px',
                      fontWeight: 800,
                      padding: '2px 6px',
                      borderRadius: '8px',
                      backgroundColor: isLit ? 'rgba(0,0,0,0.35)' : 'rgba(255,255,255,0.1)',
                      color: isLit ? '#fde047' : '#94a3b8'
                    }}
                  >
                    {isLit ? 'ON' : 'OFF'}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewMode(room.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 12px',
                    borderRadius: '12px',
                    border: '1px solid rgba(56, 189, 248, 0.5)',
                    background: 'rgba(2, 132, 199, 0.35)',
                    color: '#38bdf8',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <span>🚶 Vào phòng</span>
                </button>
              </div>
            </Html>
          );
        })}

      {/* ================= CẢNH BÁO HOLOGRAPHIC NẾU CÓ SAI LỆCH MISMATCH ================= */}
      {mismatch.detected && (
        <group position={[-2.0, 3.8, 2.0]}>
          <mesh>
            <octahedronGeometry args={[0.38, 0]} />
            <meshBasicMaterial color="#ef4444" wireframe />
          </mesh>
          <pointLight color="#ef4444" intensity={5} distance={6} />
        </group>
      )}
    </>
  );
}
