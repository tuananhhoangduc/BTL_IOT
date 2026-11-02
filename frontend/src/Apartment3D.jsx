import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox, Html, Grid } from '@react-three/drei';

// =========================================================================
// 1. THIẾT BỊ NHÀ THÔNG MINH GẮN TƯỜNG (SMART HOME APPLIANCES)
// =========================================================================

// --- BẢNG ĐIỀU KHIỂN NHIỆT ĐỘ THÔNG MINH GẮN TƯỜNG (SMART THERMOSTAT) ---
function SmartWallThermostat({ position, temp, hum }) {
  return (
    <group position={position}>
      {/* Khung viền kim loại cao cấp phẳng theo tường */}
      <mesh castShadow>
        <boxGeometry args={[0.35, 0.45, 0.03]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Màn hình kính cảm ứng đen bóng */}
      <mesh position={[0, 0, 0.016]}>
        <boxGeometry args={[0.3, 0.4, 0.005]} />
        <meshStandardMaterial color="#020617" roughness={0.1} />
      </mesh>
      {/* Hiển thị số nhiệt độ & độ ẩm dạng OLED phẳng theo tường */}
      <Html position={[0, 0, 0.022]} transform scale={0.12}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            textAlign: 'center',
            color: '#38bdf8',
            userSelect: 'none',
            padding: '4px'
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>{temp}°C</div>
          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px' }}>Độ ẩm: {hum}%</div>
          <div style={{ fontSize: '8px', color: '#10b981', marginTop: '2px' }}>● Smart Climate</div>
        </div>
      </Html>
    </group>
  );
}

// --- CÔNG TẮC CẢM ỨNG GẮN TƯỜNG THÔNG MINH CHO TỪNG PHÒNG (SMART TOUCH SWITCH) ---
function SmartWallSwitch({ position, rotation = [0, 0, 0], isLit, isMismatch, label, onClick }) {
  return (
    <group position={position} rotation={rotation}>
      {/* Khung đế công tắc âm tường */}
      <mesh castShadow>
        <boxGeometry args={[0.26, 0.26, 0.02]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.2} />
      </mesh>
      {/* Mặt kính cường lực phẳng chống xước */}
      <mesh position={[0, 0, 0.012]} onClick={onClick} style={{ cursor: 'pointer' }}>
        <boxGeometry args={[0.24, 0.24, 0.008]} />
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.2} />
      </mesh>
      {/* Nút bấm cảm ứng LED dạng tròn */}
      <mesh position={[0, 0, 0.018]} onClick={onClick} style={{ cursor: 'pointer' }}>
        <cylinderGeometry args={[0.055, 0.055, 0.008, 24]} rotation={[Math.PI / 2, 0, 0]} />
        <meshStandardMaterial
          color={isMismatch ? '#ef4444' : isLit ? '#facc15' : '#64748b'}
          emissive={isMismatch ? '#ef4444' : isLit ? '#facc15' : '#000000'}
          emissiveIntensity={isMismatch ? 3.5 : isLit ? 2.5 : 0}
        />
      </mesh>
      {/* Ánh sáng dịu lan tỏa khi BẬT */}
      {isLit && (
        <pointLight position={[0, 0, 0.1]} color="#fde047" intensity={0.8} distance={1.2} />
      )}
      {/* Nhãn 3D hiển thị rõ tên phòng và trạng thái ON/OFF */}
      <Html position={[0, 0.22, 0.04]} center distanceFactor={9}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '3px 8px',
            background: isLit ? 'rgba(234, 179, 8, 0.35)' : 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: isLit ? '1px solid #facc15' : '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '9px',
            fontWeight: 700,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            userSelect: 'none',
            boxShadow: isLit ? '0 0 10px rgba(250, 204, 21, 0.4)' : 'none'
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: isLit ? '#facc15' : '#64748b'
            }}
          />
          <span>{label}</span>
          <span style={{ fontSize: '8px', opacity: 0.85 }}>{isLit ? 'ON' : 'OFF'}</span>
        </div>
      </Html>
    </group>
  );
}

// --- ĐẦU BÁO KHÓI/CHÁY THÔNG MINH GẮN TRẦN (SMART SMOKE ALARM) ---
function SmartSmokeAlarm({ position, isAlarm, onClick }) {
  return (
    <group position={position} onClick={onClick} style={{ cursor: 'pointer' }}>
      {/* Đĩa tròn gắn trần của đầu báo khói */}
      <mesh castShadow>
        <cylinderGeometry args={[0.22, 0.25, 0.08, 24]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </mesh>
      {/* Vành đèn báo động khẩn cấp */}
      <mesh position={[0, -0.045, 0]}>
        <cylinderGeometry args={[0.08, 0.08, 0.02, 16]} />
        <meshStandardMaterial
          color={isAlarm ? '#ef4444' : '#10b981'}
          emissive={isAlarm ? '#ef4444' : '#10b981'}
          emissiveIntensity={isAlarm ? 3.0 : 0.8}
        />
      </mesh>
      {/* Vòng sóng âm phát sáng khi còi kêu */}
      {isAlarm && (
        <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.2, 0.45, 24]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.6} side={2} />
        </mesh>
      )}
    </group>
  );
}

// =========================================================================
// 2. HỆ THỐNG CHIẾU SÁNG KIẾN TRÚC THỰC TẾ (ARCHITECTURAL LIGHTING)
// =========================================================================

function HomeLightingFixture({ position, isLit, label, onClick }) {
  return (
    <group position={position}>
      {/* Chao đèn treo thả / ốp trần phong cách Bắc Âu */}
      <mesh position={[0, 2.1, 0]} castShadow onClick={onClick} style={{ cursor: 'pointer' }}>
        <cylinderGeometry args={[0.22, 0.28, 0.1, 24]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Chao đèn thủy tinh phát sáng */}
      <mesh position={[0, 2.03, 0]} onClick={onClick} style={{ cursor: 'pointer' }}>
        <cylinderGeometry args={[0.2, 0.2, 0.04, 24]} />
        <meshStandardMaterial
          color={isLit ? '#ffffff' : '#cbd5e1'}
          emissive={isLit ? '#fde047' : '#000000'}
          emissiveIntensity={isLit ? 3.5 : 0}
          roughness={0.2}
        />
      </mesh>

      {/* Nguồn sáng PointLight vàng ấm rọi bóng chân thực khi BẬT */}
      {isLit && (
        <>
          <pointLight
            position={[0, 1.95, 0]}
            color="#fffbeb"
            intensity={4.8}
            distance={5.8}
            decay={1.8}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          {/* Nón hào quang ánh sáng dịu nhẹ lan tỏa */}
          <mesh position={[0, 1.0, 0]}>
            <cylinderGeometry args={[0.15, 1.8, 2.0, 24, 1, true]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.06} side={2} depthWrite={false} />
          </mesh>
        </>
      )}

      {/* Huy hiệu 3D kính mờ nổi thanh lịch */}
      <Html position={[0, 2.45, 0]} center distanceFactor={11}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 12px',
            background: isLit ? 'rgba(234, 179, 8, 0.25)' : 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(12px)',
            border: isLit ? '1px solid rgba(250, 204, 21, 0.8)' : '1px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: isLit ? '0 0 16px rgba(234, 179, 8, 0.4)' : '0 4px 12px rgba(0, 0, 0, 0.4)',
            transition: 'all 0.25s ease',
            whiteSpace: 'nowrap',
            userSelect: 'none'
          }}
        >
          <span
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isLit ? '#facc15' : '#64748b',
              boxShadow: isLit ? '0 0 8px #facc15' : 'none'
            }}
          />
          <span>{label}</span>
          <span
            style={{
              fontSize: '9px',
              opacity: 0.85,
              padding: '2px 6px',
              background: isLit ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
              borderRadius: '10px'
            }}
          >
            {isLit ? 'ON' : 'OFF'}
          </span>
        </div>
      </Html>
    </group>
  );
}

// =========================================================================
// 3. NỘI THẤT CĂN HỘ CAO CẤP THỰC TẾ (REALISTIC COZY FURNITURE)
// =========================================================================

// --- 1. PHÒNG KHÁCH: Sofa góc chữ L, Bàn trà, Kệ TV, Màn hình OLED, Cây cảnh ---
function LivingRoomSpace() {
  return (
    <group position={[-2.1, 0, 2.1]}>
      {/* Thảm dệt phòng khách cao cấp (Nằm phẳng trên sàn, không bị dựng đứng) */}
      <mesh position={[0, 0.022, 0.1]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2.6, 2.0]} />
        <meshStandardMaterial color="#334155" roughness={0.95} />
      </mesh>

      {/* Sofa góc chữ L êm ái bọc vải nỉ than chì */}
      <group position={[0.5, 0, -0.4]}>
        {/* Đệm ngồi chính */}
        <RoundedBox args={[1.8, 0.36, 0.8]} radius={0.06} smoothness={4} position={[0, 0.22, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </RoundedBox>
        {/* Phần góc L kéo dài */}
        <RoundedBox args={[0.8, 0.36, 0.9]} radius={0.06} smoothness={4} position={[0.5, 0.22, 0.85]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </RoundedBox>
        {/* Tựa lưng sofa */}
        <RoundedBox args={[1.8, 0.42, 0.18]} radius={0.04} smoothness={4} position={[0, 0.52, -0.31]} castShadow>
          <meshStandardMaterial color="#0f172a" roughness={0.8} />
        </RoundedBox>
        {/* Gối tựa trang trí màu vàng ấm & xanh ngọc */}
        <RoundedBox args={[0.38, 0.28, 0.12]} radius={0.03} smoothness={3} position={[-0.45, 0.48, -0.2]} rotation={[0.1, 0.2, 0]}>
          <meshStandardMaterial color="#eab308" roughness={0.5} />
        </RoundedBox>
        <RoundedBox args={[0.38, 0.28, 0.12]} radius={0.03} smoothness={3} position={[0.1, 0.48, -0.2]} rotation={[0.1, -0.15, 0]}>
          <meshStandardMaterial color="#0284c7" roughness={0.5} />
        </RoundedBox>
      </group>

      {/* Bàn trà gỗ sồi tự nhiên chân kim loại */}
      <group position={[-0.2, 0, 0.2]}>
        <RoundedBox args={[1.0, 0.06, 0.6]} radius={0.02} smoothness={3} position={[0, 0.28, 0]} castShadow>
          <meshStandardMaterial color="#b45309" roughness={0.3} />
        </RoundedBox>
        {[-0.42, 0.42].map((x, i) =>
          [-0.24, 0.24].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.14, z]}>
              <cylinderGeometry args={[0.02, 0.02, 0.28, 8]} />
              <meshStandardMaterial color="#090d16" metalness={0.9} />
            </mesh>
          ))
        )}
      </group>

      {/* Kệ tivi gỗ & Màn hình TV OLED siêu mỏng gắn tường (Đã sửa chuẩn góc xoay & triệt tiêu nhấp nháy Z-fighting) */}
      <group position={[-1.9, 0, 0.2]}>
        {/* Kệ tivi thấp hiện đại */}
        <RoundedBox args={[0.38, 0.32, 2.0]} radius={0.03} smoothness={3} position={[0, 0.16, 0]} castShadow>
          <meshStandardMaterial color="#090d16" roughness={0.4} />
        </RoundedBox>

        {/* Khung viền TV OLED siêu mỏng sát tường */}
        <mesh position={[0.02, 0.85, 0]} castShadow>
          <boxGeometry args={[0.04, 0.84, 1.54]} />
          <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Màn hình TV OLED dạng khối Box 3D hướng ra phòng (Không dùng Plane 2D để triệt tiêu hoàn toàn lỗi nhấp nháy Z-fighting) */}
        <mesh position={[0.042, 0.85, 0]}>
          <boxGeometry args={[0.006, 0.76, 1.46]} />
          <meshStandardMaterial
            color="#0284c7"
            emissive="#0284c7"
            emissiveIntensity={0.6}
            roughness={0.1}
            metalness={0.8}
          />
        </mesh>

        {/* Loa Soundbar rạp hát gia đình */}
        <RoundedBox args={[0.1, 0.05, 1.0]} radius={0.01} smoothness={2} position={[0.06, 0.35, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
        </RoundedBox>
      </group>

      {/* Chậu cây cảnh Monstera xanh mát trong góc phòng */}
      <group position={[1.4, 0, -1.4]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.5, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.65, 0]} castShadow>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color="#15803d" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// --- 2. PHÒNG NGỦ: Giường đôi nệm êm, Chăn ấm, Tab đầu giường, Tủ quần áo ---
function BedroomSpace() {
  return (
    <group position={[-2.1, 0, -2.1]}>
      {/* Giường đôi phong cách Bắc Âu */}
      <group position={[-0.3, 0, 0.2]}>
        {/* Khung giường gỗ sồi */}
        <RoundedBox args={[1.9, 0.28, 2.1]} radius={0.04} smoothness={3} position={[0, 0.15, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#451a03" roughness={0.5} />
        </RoundedBox>
        {/* Nệm trắng cao cấp */}
        <RoundedBox args={[1.75, 0.22, 1.95]} radius={0.04} smoothness={4} position={[0, 0.35, 0.02]} castShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.8} />
        </RoundedBox>
        {/* Chăn phủ ấm cúng màu xanh hoàng gia */}
        <RoundedBox args={[1.76, 0.09, 1.2]} radius={0.04} smoothness={3} position={[0, 0.44, 0.4]} castShadow>
          <meshStandardMaterial color="#1e3a8a" roughness={0.7} />
        </RoundedBox>
        {/* Tựa đầu giường đệm nỉ */}
        <RoundedBox args={[1.9, 0.75, 0.14]} radius={0.04} smoothness={3} position={[0, 0.55, -1.02]} castShadow>
          <meshStandardMaterial color="#334155" roughness={0.7} />
        </RoundedBox>
        {/* 2 Chiếc gối êm ái */}
        <RoundedBox args={[0.6, 0.12, 0.38]} radius={0.04} smoothness={3} position={[-0.48, 0.5, -0.7]} rotation={[0.2, 0, 0]}>
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </RoundedBox>
        <RoundedBox args={[0.6, 0.12, 0.38]} radius={0.04} smoothness={3} position={[0.48, 0.5, -0.7]} rotation={[0.2, 0, 0]}>
          <meshStandardMaterial color="#ffffff" roughness={0.9} />
        </RoundedBox>
      </group>

      {/* Tab đầu giường có đèn ngủ */}
      <group position={[1.0, 0, -0.8]}>
        <RoundedBox args={[0.45, 0.4, 0.45]} radius={0.03} smoothness={3} position={[0, 0.2, 0]} castShadow>
          <meshStandardMaterial color="#1e293b" />
        </RoundedBox>
        {/* Đèn ngủ mini để bàn */}
        <mesh position={[0, 0.52, 0]}>
          <cylinderGeometry args={[0.09, 0.13, 0.2, 16]} />
          <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.6} />
        </mesh>
      </group>

      {/* Tủ quần áo cánh trượt hiện đại sát tường */}
      <RoundedBox args={[0.6, 1.6, 1.6]} radius={0.04} smoothness={3} position={[-1.6, 0.8, 0.2]} castShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </RoundedBox>
    </group>
  );
}

// --- QUẠT HÚT THÔNG MINH 5 CÁNH KHÍ ĐỘNG HỌC (SMART AERODYNAMIC EXHAUST FAN - CHUẨN BẢN TRƯỚC) ---
function SmartExhaustFan({ position, rotation = [Math.PI / 2, 0, 0], isFanRunning, fanSpeed = 0, onFanClick }) {
  const propellerRef = useRef();
  const currentSpeed = useRef(0);
  const vortexRef = useRef();

  useFrame((_, delta) => {
    // 4 Mức tốc độ góc thực tế (rad/s):
    // Mức 0: 0 rad/s (Dừng hẳn)
    // Mức 1: 5.5 rad/s (Êm dịu, thấy rõ 5 cánh quạt lướt nhẹ nhàng)
    // Mức 2: 15.0 rad/s (Tiêu chuẩn, quay nhanh mượt)
    // Mức 3: 36.0 rad/s (Turbo cực đại, bứt tốc mạnh mẽ)
    const speedTargets = [0, 5.5, 15.0, 36.0];
    const target = speedTargets[fanSpeed] !== undefined
      ? speedTargets[fanSpeed]
      : (isFanRunning ? 22.0 : 0);

    // Hiệu ứng quán tính quay mượt mà (Gia tốc và hãm đà thực tế)
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
      default: return '#64748b'; // Xám than chì khi tắt
    }
  };

  const statusColor = getStatusColor();

  return (
    <group position={position}>
      {/* Cụm quạt 3D xoay ngang 90 độ chuẩn bản trước */}
      <group rotation={rotation}>
        {/* 1. KHUNG VỎ VÀ CHAO KÍNH KHÍ ĐỘNG HỌC HIỆN ĐẠI (CHUẨN BẢN TRƯỚC, KHÔNG HỘP ĐEN) */}
        <group onClick={onFanClick} style={{ cursor: 'pointer' }}>
          {/* Ống dẫn khí inox vươn vào tường / trần */}
          <mesh position={[0, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.11, 0.11, 0.55, 24]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
          </mesh>

          {/* Khung mô-tơ trên */}
          <mesh position={[0, 0.16, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.26, 0.12, 24]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.2} />
          </mesh>

          {/* Vòm kính cường lực pha lê trong suốt (Crystal Clear Canopy) */}
          {/* Giúp nhìn xuyên thấu toàn bộ chuyển động của 5 cánh quạt */}
          <mesh position={[0, 0.1, 0]}>
            <cylinderGeometry args={[0.42, 0.56, 0.04, 32]} />
            <meshPhysicalMaterial
              color="#bae6fd"
              transparent
              opacity={0.3}
              transmission={0.92}
              roughness={0.05}
              thickness={0.08}
            />
          </mesh>

          {/* Vành kim loại bảo vệ viền ngoài mạ crom bóng */}
          <mesh position={[0, 0.08, 0]}>
            <torusGeometry args={[0.56, 0.015, 16, 40]} />
            <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.15} />
          </mesh>

          {/* Vành đèn Neon LED thông minh báo trạng thái cấp độ */}
          <mesh position={[0, 0.06, 0]}>
            <torusGeometry args={[0.48, 0.012, 16, 40]} />
            <meshStandardMaterial
              color={statusColor}
              emissive={statusColor}
              emissiveIntensity={fanSpeed > 0 ? 3.0 : 0.2}
            />
          </mesh>
        </group>

        {/* 2. CỤM TRỤC QUAY & 5 CÁNH QUẠT KHÍ ĐỘNG HỌC THỰC THỤ */}
        <group ref={propellerRef} position={[0, 0, 0]} onClick={onFanClick} style={{ cursor: 'pointer' }}>
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

                  {/* Vạch dạ quang thể thao trên đầu cánh quạt (Tạo hiệu ứng vệt chuyển động rực rỡ khi quay) */}
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
              <cylinderGeometry args={[0.14, 0.42, 0.52, 24, 1, true]} />
              <meshBasicMaterial
                color={fanSpeed === 3 ? '#38bdf8' : '#7dd3fc'}
                transparent
                opacity={fanSpeed === 3 ? 0.24 : fanSpeed === 2 ? 0.15 : 0.08}
                side={2}
                depthWrite={false}
              />
            </mesh>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.16, 0]}>
              <ringGeometry args={[0.2, 0.35, 24]} />
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

      {/* 4. HUY HIỆU 3D TƯƠNG TÁC NỔI (CLICK TRỰC TIẾP ĐỂ CHUYỂN CẤP ĐỘ, LUÔN ĐỨNG THẲNG) */}
      <Html position={[0, 0.65, 0]} center distanceFactor={11}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            onFanClick();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            background: fanSpeed > 0 ? 'rgba(14, 165, 233, 0.32)' : 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(12px)',
            border: fanSpeed > 0 ? `1px solid ${statusColor}` : '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '20px',
            color: '#ffffff',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: fanSpeed > 0 ? `0 0 16px ${statusColor}66` : '0 4px 12px rgba(0, 0, 0, 0.5)',
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
          <span>QUẠT BẾP</span>
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
    </group>
  );
}

// --- 3. BẾP: Tủ bếp chữ L mặt đá, Bếp từ, Bồn rửa, Bàn ăn, Quạt hút mùi Smart ---
function KitchenSpace({ isFanRunning, fanSpeed = 0, onFanClick }) {
  return (
    <group position={[2.1, 0, 2.1]}>
      {/* Tủ bếp chữ L mặt đá thạch anh trắng */}
      <group position={[0.2, 0, 1.5]}>
        <RoundedBox args={[2.3, 0.75, 0.6]} radius={0.03} smoothness={3} position={[0, 0.38, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </RoundedBox>
        {/* Mặt đá thạch anh sáng bóng */}
        <RoundedBox args={[2.34, 0.06, 0.64]} radius={0.02} smoothness={3} position={[0, 0.78, 0]} castShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.15} metalness={0.1} />
        </RoundedBox>
        {/* Bếp từ âm mặt kính đen */}
        <mesh position={[-0.45, 0.82, 0]}>
          <boxGeometry args={[0.75, 0.02, 0.42]} />
          <meshStandardMaterial color="#0a0f1d" roughness={0.1} metalness={0.8} />
        </mesh>
        <mesh position={[-0.65, 0.84, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.01, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[-0.25, 0.84, 0]}>
          <cylinderGeometry args={[0.13, 0.13, 0.01, 16]} />
          <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.5} />
        </mesh>
        {/* Bồn rửa chén inox & vòi nước */}
        <mesh position={[0.55, 0.82, 0]}>
          <boxGeometry args={[0.55, 0.02, 0.38]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
        </mesh>
      </group>

      {/* Bàn ăn nhỏ & 2 ghế ăn phong cách gia đình */}
      <group position={[0.1, 0, 0]}>
        <RoundedBox args={[1.2, 0.05, 0.8]} radius={0.02} smoothness={3} position={[0, 0.72, 0]} castShadow>
          <meshStandardMaterial color="#b45309" roughness={0.4} />
        </RoundedBox>
        {[-0.5, 0.5].map((x, i) =>
          [-0.32, 0.32].map((z, j) => (
            <mesh key={`${i}-${j}`} position={[x, 0.35, z]}>
              <cylinderGeometry args={[0.025, 0.025, 0.7, 8]} />
              <meshStandardMaterial color="#090d16" metalness={0.8} />
            </mesh>
          ))
        )}
      </group>

      {/* QUẠT HÚT THÔNG MINH 5 CÁNH KHÍ ĐỘNG HỌC (CHUẨN BẢN TRƯỚC, KHÔNG CỤC ĐEN, XOAY NGANG 90 ĐỘ) */}
      <SmartExhaustFan
        position={[-0.25, 1.6, 1.5]}
        rotation={[Math.PI / 2, 0, 0]}
        isFanRunning={isFanRunning}
        fanSpeed={fanSpeed}
        onFanClick={onFanClick}
      />
    </group>
  );
}

// --- 4. BAN CÔNG: Ghế thư giãn, Bàn trà, Cây xanh & Lan can kính cường lực ---
function BalconySpace() {
  return (
    <group position={[2.1, 0, -2.1]}>
      {/* Ghế thư giãn ngoài trời */}
      <group position={[0.4, 0, -0.4]}>
        <RoundedBox args={[0.7, 0.36, 0.7]} radius={0.04} smoothness={3} position={[0, 0.22, 0]} castShadow>
          <meshStandardMaterial color="#475569" roughness={0.8} />
        </RoundedBox>
        <RoundedBox args={[0.7, 0.42, 0.14]} radius={0.04} smoothness={3} position={[0, 0.52, -0.3]} castShadow>
          <meshStandardMaterial color="#334155" />
        </RoundedBox>
      </group>

      {/* 2 Chậu cây xanh đón nắng */}
      <group position={[-1.1, 0, 0.8]}>
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.16, 0.44, 16]} />
          <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.55, 0]} castShadow>
          <sphereGeometry args={[0.3, 12, 12]} />
          <meshStandardMaterial color="#16a34a" roughness={0.6} />
        </mesh>
      </group>
      <group position={[-1.2, 0, -0.6]}>
        <mesh position={[0, 0.18, 0]} castShadow>
          <cylinderGeometry args={[0.2, 0.14, 0.36, 16]} />
          <meshStandardMaterial color="#ea580c" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow>
          <sphereGeometry args={[0.24, 12, 12]} />
          <meshStandardMaterial color="#22c55e" roughness={0.5} />
        </mesh>
      </group>

      {/* Cảm biến ánh sáng vòm gắn trên lan can ban công */}
      <group position={[1.8, 0.95, -1.0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.06, 0.06, 0.06, 12]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0.04, 0]}>
          <sphereGeometry args={[0.05, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#38bdf8" emissive="#38bdf8" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* LAN CAN KÍNH CƯỜNG LỰC TRONG SUỐT VỚI TAY VỊN KIM LOẠI */}
      <mesh position={[1.85, 0.48, 0]}>
        <boxGeometry args={[0.04, 0.85, 3.8]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transparent
          opacity={0.35}
          roughness={0.05}
          transmission={0.6}
          thickness={0.2}
        />
      </mesh>
      <mesh position={[0, 0.48, -1.85]}>
        <boxGeometry args={[3.8, 0.85, 0.04]} />
        <meshPhysicalMaterial
          color="#bae6fd"
          transparent
          opacity={0.35}
          roughness={0.05}
          transmission={0.6}
          thickness={0.2}
        />
      </mesh>
      {/* Tay vịn kim loại viền trên */}
      <mesh position={[1.85, 0.93, 0]}>
        <boxGeometry args={[0.08, 0.05, 3.8]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
      <mesh position={[0, 0.93, -1.85]}>
        <boxGeometry args={[3.8, 0.05, 0.08]} />
        <meshStandardMaterial color="#334155" metalness={0.8} />
      </mesh>
    </group>
  );
}

// =========================================================================
// 4. KIẾN TRÚC TOÀN CẢNH CĂN HỘ 3D ISOMETRIC
// =========================================================================

export default function Apartment3D({ twinData, onToggle }) {
  const reported = twinData.reported || {};
  const mismatch = twinData.mismatch || {};

  return (
    <>
      {/* Cyber Grid vô cực công nghệ */}
      <Grid
        renderOrder={-1}
        position={[0, -0.42, 0]}
        infiniteGrid
        cellSize={0.5}
        cellThickness={0.6}
        cellColor="#1e293b"
        sectionSize={2.5}
        sectionThickness={1.2}
        sectionColor="#0284c7"
        fadeDistance={26}
      />

      <ambientLight intensity={0.45} />
      <directionalLight
        position={[14, 18, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />
      <directionalLight position={[-12, 10, -10]} intensity={0.35} color="#38bdf8" />

      {/* ================= KHỐI ĐẾ KIẾN TRÚC (BASE PEDESTAL) ================= */}
      <RoundedBox args={[8.8, 0.4, 8.8]} radius={0.08} smoothness={4} position={[0, -0.2, 0]} receiveShadow>
        <meshStandardMaterial color="#0f172a" roughness={0.6} metalness={0.2} />
      </RoundedBox>

      {/* ================= MẶT SÀN TỪNG PHÒNG ================= */}
      {/* 1. Sàn Gỗ Tự Nhiên Phòng Khách */}
      <mesh position={[-2.1, 0.01, 2.1]} receiveShadow>
        <boxGeometry args={[3.9, 0.02, 3.9]} />
        <meshStandardMaterial color="#92400e" roughness={0.35} />
      </mesh>

      {/* 2. Sàn Gỗ Tự Nhiên Phòng Ngủ */}
      <mesh position={[-2.1, 0.01, -2.1]} receiveShadow>
        <boxGeometry args={[3.9, 0.02, 3.9]} />
        <meshStandardMaterial color="#78350f" roughness={0.4} />
      </mesh>

      {/* 3. Sàn Gạch Men Trắng Phòng Bếp */}
      <mesh position={[2.1, 0.01, 2.1]} receiveShadow>
        <boxGeometry args={[3.9, 0.02, 3.9]} />
        <meshStandardMaterial color="#cbd5e1" roughness={0.25} metalness={0.1} />
      </mesh>

      {/* 4. Sàn Gỗ Nan Ngoài Trời Ban Công */}
      <mesh position={[2.1, 0.01, -2.1]} receiveShadow>
        <boxGeometry args={[3.9, 0.02, 3.9]} />
        <meshStandardMaterial color="#5c3a21" roughness={0.8} />
      </mesh>

      {/* ================= TƯỜNG CẮT NỬA ISOMETRIC (CUTAWAY WALLS) ================= */}
      {/* Tường ngoài mặt Sau (Back Wall: Cao 1.4) */}
      <RoundedBox args={[8.2, 1.4, 0.16]} radius={0.02} smoothness={3} position={[0, 0.7, -4.12]} castShadow receiveShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </RoundedBox>
      {/* Tường ngoài mặt Trái (Left Wall: Cao 1.4) */}
      <RoundedBox args={[0.16, 1.4, 8.2]} radius={0.02} smoothness={3} position={[-4.12, 0.7, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.6} />
      </RoundedBox>

      {/* Tường ngăn X giữa Ngủ và Khách có chừa ô cửa lưu thông */}
      <group position={[-2.1, 0, 0]}>
        <RoundedBox args={[2.4, 1.2, 0.15]} radius={0.02} smoothness={3} position={[-0.8, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </RoundedBox>
        {/* Nẹp khuôn cửa gỗ cao cấp */}
        <mesh position={[0.7, 1.15, 0]} castShadow>
          <boxGeometry args={[1.4, 0.1, 0.18]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
      </group>

      {/* Tường ngăn X giữa Bếp và Ban công có chừa ô cửa lưu thông */}
      <group position={[2.1, 0, 0]}>
        <RoundedBox args={[2.4, 1.2, 0.15]} radius={0.02} smoothness={3} position={[0.8, 0.6, 0]} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </RoundedBox>
        <mesh position={[-0.7, 1.15, 0]} castShadow>
          <boxGeometry args={[1.4, 0.1, 0.18]} />
          <meshStandardMaterial color="#78350f" roughness={0.5} />
        </mesh>
      </group>

      {/* Tường ngăn Z trung tâm chia Trái và Phải */}
      <group position={[0, 0, 2.1]}>
        <RoundedBox args={[0.15, 1.2, 2.4]} radius={0.02} smoothness={3} position={[0, 0.6, 0.8]} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </RoundedBox>
      </group>
      <group position={[0, 0, -2.1]}>
        <RoundedBox args={[0.15, 1.2, 2.4]} radius={0.02} smoothness={3} position={[0, 0.6, -0.8]} castShadow receiveShadow>
          <meshStandardMaterial color="#f8fafc" roughness={0.6} />
        </RoundedBox>
      </group>

      {/* Nẹp viền trên màu chì bảo vệ tường */}
      <mesh position={[0, 1.42, -4.12]}>
        <boxGeometry args={[8.24, 0.04, 0.18]} />
        <meshStandardMaterial color="#334155" />
      </mesh>
      <mesh position={[-4.12, 1.42, 0]}>
        <boxGeometry args={[0.18, 0.04, 8.24]} />
        <meshStandardMaterial color="#334155" />
      </mesh>

      {/* Len chân tường vân gỗ sang trọng */}
      <mesh position={[0, 0.04, -4.02]}>
        <boxGeometry args={[8.16, 0.08, 0.04]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>
      <mesh position={[-4.02, 0.04, 0]}>
        <boxGeometry args={[0.04, 0.08, 8.16]} />
        <meshStandardMaterial color="#78350f" />
      </mesh>

      {/* ================= KHÔNG GIAN NỘI THẤT 4 PHÒNG ================= */}
      <LivingRoomSpace />
      <BedroomSpace />
      <KitchenSpace
        isFanRunning={reported.fan_kitchen === 1 || (reported.fan_speed && reported.fan_speed > 0)}
        fanSpeed={reported.fan_speed !== undefined ? reported.fan_speed : (reported.fan_kitchen ? 3 : 0)}
        onFanClick={() => {
          const nextSpeed = ((reported.fan_speed || 0) + 1) % 4;
          onToggle('setFan', nextSpeed);
        }}
      />
      <BalconySpace />

      {/* ================= THIẾT BỊ NHÀ THÔNG MINH GẮN TƯỜNG (SENSORS) ================= */}
      {/* 1. Bảng điều khiển nhiệt ẩm Smart Thermostat (Hiển thị DHT11 phẳng sát tường, đã sửa góc xoay) */}
      <SmartWallThermostat
        position={[-1.2, 0.95, 0.08]}
        temp={Number(reported.temperature || 27.8).toFixed(1)}
        hum={Number(reported.humidity || 66).toFixed(0)}
      />

      {/* 2. Đầu báo khói/cháy thông minh gắn trần bếp */}
      <SmartSmokeAlarm
        position={[2.1, 2.2, 2.1]}
        isAlarm={reported.fire_alarm === 1 || mismatch.detected}
        onClick={() => onToggle('setAlarm', reported.fire_alarm !== 1)}
      />

      {/* ================= HỆ THỐNG CÔNG TẮC ĐÈN CẢM ỨNG GẮN TƯỜNG 4 PHÒNG ================= */}
      {/* 1. Công tắc Phòng khách (Gắn tường phòng khách, bấm đổi trạng thái đèn khách) */}
      <SmartWallSwitch
        position={[-0.4, 0.95, 0.08]}
        rotation={[0, 0, 0]}
        isLit={reported.light_living === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_living'}
        label="CÔNG TẮC KHÁCH"
        onClick={() => onToggle('setLiving', reported.light_living !== 1)}
      />

      {/* 2. Công tắc Phòng ngủ (Gắn tường phòng ngủ, bấm đổi trạng thái đèn ngủ) */}
      <SmartWallSwitch
        position={[-1.2, 0.95, -0.08]}
        rotation={[0, Math.PI, 0]}
        isLit={reported.light_bed === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_bed'}
        label="CÔNG TẮC NGỦ"
        onClick={() => onToggle('setBed', reported.light_bed !== 1)}
      />

      {/* 3. Công tắc Phòng bếp (Gắn tường bếp, bấm đổi trạng thái đèn bếp) */}
      <SmartWallSwitch
        position={[0.08, 0.95, 0.8]}
        rotation={[0, -Math.PI / 2, 0]}
        isLit={reported.light_kitchen === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_kitchen'}
        label="CÔNG TẮC BẾP"
        onClick={() => onToggle('setKitchen', reported.light_kitchen !== 1)}
      />

      {/* 4. Công tắc Ban công (Gắn tường kính ban công, bấm đổi trạng thái đèn ban công) */}
      <SmartWallSwitch
        position={[1.2, 0.95, -0.08]}
        rotation={[0, Math.PI, 0]}
        isLit={reported.light_balcony === 1}
        isMismatch={mismatch.detected && mismatch.zone === 'light_balcony'}
        label="CÔNG TẮC BAN CÔNG"
        onClick={() => onToggle('setBalcony', reported.light_balcony !== 1)}
      />

      {/* ================= HỆ THỐNG ĐÈN CHIẾU SÁNG KIẾN TRÚC ================= */}
      {/* 1. Đèn Phòng Khách */}
      <HomeLightingFixture
        position={[-2.1, 0, 2.1]}
        isLit={reported.light_living === 1}
        label="PHÒNG KHÁCH"
        onClick={() => onToggle('setLiving', reported.light_living !== 1)}
      />

      {/* 2. Đèn Phòng Ngủ */}
      <HomeLightingFixture
        position={[-2.1, 0, -2.1]}
        isLit={reported.light_bed === 1}
        label="PHÒNG NGỦ"
        onClick={() => onToggle('setBed', reported.light_bed !== 1)}
      />

      {/* 3. Đèn Bếp */}
      <HomeLightingFixture
        position={[2.1, 0, 2.1]}
        isLit={reported.light_kitchen === 1}
        label="BẾP"
        onClick={() => onToggle('setKitchen', reported.light_kitchen !== 1)}
      />

      {/* 4. Đèn Ban Công */}
      <HomeLightingFixture
        position={[2.1, 0, -2.1]}
        isLit={reported.light_balcony === 1}
        label="BAN CÔNG"
        onClick={() => onToggle('setBalcony', reported.light_balcony !== 1)}
      />

      {/* ================= CẢNH BÁO HOLOGRAPHIC NẾU CÓ SAI LỆCH MISMATCH ================= */}
      {mismatch.detected && (
        <group position={[-2.1, 2.6, 2.1]}>
          <mesh>
            <octahedronGeometry args={[0.32, 0]} />
            <meshBasicMaterial color="#ef4444" wireframe />
          </mesh>
          <pointLight color="#ef4444" intensity={4} distance={4} />
        </group>
      )}
    </>
  );
}
