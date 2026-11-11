import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Fan,
  Lightbulb,
  Bell,
  Wifi,
  Thermometer,
  Droplets,
  Sun,
  Sliders,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Compass,
  Eye,
  Tv,
  Bed,
  Utensils,
  Flower2,
  RotateCw
} from 'lucide-react';

export default function TwinHUD({
  twinData,
  onToggle,
  viewMode,
  setViewMode,
  autoRotate,
  setAutoRotate,
  weatherState = {},
  onWeatherChange
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isWeatherCollapsed, setIsWeatherCollapsed] = useState(false);

  const reported = twinData.reported || {};
  const mismatch = twinData.mismatch || {};
  const healthScore = twinData.health_score !== undefined ? twinData.health_score : 100;
  const weather = weatherState || {};

  // Danh mục 6 thiết bị Smart Home điều khiển hai chiều RPC
  const smartDevices = [
    {
      id: 'living',
      label: 'Đèn Phòng khách',
      room: 'Khu vực tiếp khách',
      method: 'setLiving',
      isLit: reported.light_living === 1,
      type: 'light'
    },
    {
      id: 'bed',
      label: 'Đèn Phòng ngủ',
      room: 'Khu vực nghỉ ngơi',
      method: 'setBed',
      isLit: reported.light_bed === 1,
      type: 'light'
    },
    {
      id: 'kitchen',
      label: 'Đèn Bếp',
      room: 'Khu vực nấu nướng',
      method: 'setKitchen',
      isLit: reported.light_kitchen === 1,
      type: 'light'
    },
    {
      id: 'fan',
      label: 'Quạt hút mùi bếp (PWM)',
      room: 'Điều tốc MOSFET 3 cấp',
      method: 'setFan',
      isLit: reported.fan_kitchen === 1 || (reported.fan_speed && reported.fan_speed > 0),
      type: 'fan'
    },
    {
      id: 'balcony',
      label: 'Đèn Ban công',
      room: 'Khu vực thư giãn ngoài trời',
      method: 'setBalcony',
      isLit: reported.light_balcony === 1,
      type: 'light'
    },
    {
      id: 'alarm',
      label: 'Còi chíp Báo động',
      room: 'Hệ thống an ninh PCCC',
      method: 'setAlarm',
      isLit: reported.fire_alarm === 1,
      type: 'alarm'
    }
  ];

  const getRoomDisplayName = () => {
    switch (viewMode) {
      case 'living':
        return 'PHÒNG KHÁCH';
      case 'bedroom':
        return 'PHÒNG NGỦ';
      case 'kitchen':
        return 'PHÒNG BẾP';
      case 'balcony':
        return 'BAN CÔNG';
      default:
        return '';
    }
  };

  const isRoomMode = ['living', 'bedroom', 'kitchen', 'balcony'].includes(viewMode);

  return (
    <>
      {/* 1. NÚT ĐÓNG / MỞ BẢNG ĐIỀU KHIỂN GÓC TRÁI (TOP-LEFT COLLAPSIBLE BUTTON) */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          ...styles.collapseBtn,
          left: isCollapsed ? '20px' : '385px'
        }}
        title={isCollapsed ? 'Mở bảng điều khiển' : 'Thu gọn bảng điều khiển'}
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        <span>{isCollapsed ? 'Mở bảng điều khiển' : 'Thu gọn bảng'}</span>
      </button>

      {/* 2. THANH TRẠNG THÁI GÓC NHÌN ĐỈNH TRANG (TOP-CENTER STATUS PILL - GIỐNG ẢNH MẪU) */}
      <div style={styles.topStatusPillContainer}>
        <div style={styles.topStatusPill}>
          {isRoomMode ? (
            <>
              <div style={styles.topStatusPillLeft}>
                <span style={{ fontSize: '14px', color: '#f59e0b' }}>🚶</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Đang đứng trong: <b style={{ color: '#38bdf8', fontWeight: 800 }}>{getRoomDisplayName()}</b>
                </span>
              </div>
              <div style={styles.topStatusPillDivider} />
              <div style={styles.topStatusPillRight}>
                <div>• Kéo chuột để quay đầu 360° quanh phòng •</div>
                <div>• Nhấn nút ở cửa để đi sang phòng khác</div>
              </div>
            </>
          ) : viewMode === 'top' ? (
            <>
              <div style={styles.topStatusPillLeft}>
                <span style={{ fontSize: '14px' }}>📐</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Chế độ: <b style={{ color: '#38bdf8', fontWeight: 800 }}>MẶT BẰNG 2D</b>
                </span>
              </div>
              <div style={styles.topStatusPillDivider} />
              <div style={styles.topStatusPillRight}>
                <div>• Góc nhìn mặt cắt vuông góc từ trên cao xuống •</div>
                <div>• Chọn phòng ở thanh điều hướng bên dưới để vào phòng</div>
              </div>
            </>
          ) : (
            <>
              <div style={styles.topStatusPillLeft}>
                <span style={{ fontSize: '14px' }}>🌐</span>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#f8fafc' }}>
                  Chế độ: <b style={{ color: '#38bdf8', fontWeight: 800 }}>TOÀN CẢNH 3D</b>
                </span>
              </div>
              <div style={styles.topStatusPillDivider} />
              <div style={styles.topStatusPillRight}>
                <div>• Nhấp 'Vào phòng' hoặc dùng thanh điều hướng bên dưới •</div>
                <div>• Kéo chuột để xoay toàn cảnh, cuộn để zoom</div>
              </div>
            </>
          )}
        </div>

        {/* CẢNH BÁO SAI LỆCH VẬT LÝ MISMATCH */}
        {mismatch.detected && (
          <div style={styles.topAlertBanner}>
            <AlertTriangle size={17} color="#f87171" style={{ animation: 'pulse 1s infinite' }} />
            <span>
              <b>CẢNH BÁO SAI LỆCH (ACTUATOR MISMATCH):</b> Trạng thái công tắc cơ tại phòng lệch với lệnh trên Web! Điểm sức khỏe H(t) hạ còn 60%.
            </span>
          </div>
        )}
      </div>

      {/* 3. BẢNG ĐIỀU KHIỂN GLASSMORPHISM CAO CẤP GÓC TRÁI */}
      <aside
        style={{
          ...styles.hudSidebar,
          transform: isCollapsed ? 'translateX(-430px)' : 'translateX(0)',
          opacity: isCollapsed ? 0 : 1,
          pointerEvents: isCollapsed ? 'none' : 'auto'
        }}
      >
        {/* Header thông tin căn hộ */}
        <div style={styles.header}>
          <div style={styles.titleRow}>
            <span style={styles.livePulse} />
            <h1 style={styles.mainTitle}>SMART HOME DIGITAL TWIN</h1>
          </div>
          <p style={styles.subTitle}>Mô hình 3D Căn hộ Thực tế • IoT Real-time</p>
        </div>

        {/* Thanh trạng thái Sức khỏe bản sao số H(t) - Chuẩn IEEE Digital Twin */}
        <div style={styles.healthCard}>
          <div style={styles.healthTopRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color={healthScore >= 80 ? '#34d399' : healthScore >= 50 ? '#fbbf24' : '#f87171'} />
              <span style={{ fontSize: '12px', fontWeight: 600, color: '#e2e8f0' }}>Sức khỏe Twin H(t)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '4px',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  background: healthScore >= 80 ? 'rgba(16, 185, 129, 0.15)' : healthScore >= 50 ? 'rgba(245, 158, 11, 0.18)' : 'rgba(239, 68, 68, 0.2)',
                  color: healthScore >= 80 ? '#34d399' : healthScore >= 50 ? '#fbbf24' : '#f87171',
                  border: `1px solid ${healthScore >= 80 ? 'rgba(52, 211, 153, 0.3)' : healthScore >= 50 ? 'rgba(251, 191, 36, 0.3)' : 'rgba(248, 113, 113, 0.3)'}`
                }}
              >
                {twinData.severity || (healthScore >= 80 ? 'NORMAL' : healthScore >= 50 ? 'WARNING' : 'CRITICAL')}
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: '13px',
                  fontWeight: 800,
                  color: healthScore >= 80 ? '#34d399' : healthScore >= 50 ? '#fbbf24' : '#f87171'
                }}
              >
                {healthScore}%
              </span>
            </div>
          </div>
          <div style={styles.healthBarBg}>
            <div
              style={{
                ...styles.healthBarFill,
                width: `${healthScore}%`,
                backgroundColor: healthScore >= 80 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444',
                boxShadow: healthScore >= 80 ? '0 0 10px #10b981' : healthScore >= 50 ? '0 0 10px #f59e0b' : '0 0 10px #ef4444'
              }}
            />
          </div>
          {twinData.status_message && (
            <div style={{ marginTop: '5px', fontSize: '10px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ display: 'inline-block', width: '5px', height: '5px', borderRadius: '50%', backgroundColor: healthScore >= 80 ? '#10b981' : healthScore >= 50 ? '#f59e0b' : '#ef4444' }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{twinData.status_message}</span>
            </div>
          )}
        </div>

        {/* Lưới 2x2 Cảm biến Môi trường Thông minh */}
        <div style={styles.telemetryGrid}>
          {/* Nhiệt độ */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Thermometer size={15} color="#fb7185" />
              <span style={styles.sensorLabel}>Nhiệt độ phòng</span>
            </div>
            <div style={styles.sensorValue}>
              {Number(reported.temperature !== undefined ? reported.temperature : 27.5).toFixed(1)}
              <span style={styles.sensorUnit}>°C</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: `${Math.min(100, ((reported.temperature || 27.5) / 45) * 100)}%`,
                  background: 'linear-gradient(90deg, #f43f5e, #fb7185)'
                }}
              />
            </div>
          </div>

          {/* Độ ẩm */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Droplets size={15} color="#38bdf8" />
              <span style={styles.sensorLabel}>Độ ẩm không khí</span>
            </div>
            <div style={styles.sensorValue}>
              {Number(reported.humidity !== undefined ? reported.humidity : 66.0).toFixed(0)}
              <span style={styles.sensorUnit}>%</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: `${Math.min(100, reported.humidity || 66)}%`,
                  background: 'linear-gradient(90deg, #0284c7, #38bdf8)'
                }}
              />
            </div>
          </div>

          {/* Ánh sáng */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Sun size={15} color="#facc15" />
              <span style={styles.sensorLabel}>Ánh sáng tự nhiên</span>
            </div>
            <div style={styles.sensorValue}>
              {reported.light_level !== undefined ? reported.light_level : 18}
              <span style={styles.sensorUnit}>%</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: `${Math.min(100, reported.light_level || 18)}%`,
                  background: 'linear-gradient(90deg, #ca8a04, #facc15)'
                }}
              />
            </div>
          </div>

          {/* Sóng Wi-Fi */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Wifi size={15} color="#4ade80" />
              <span style={styles.sensorLabel}>Kết nối IoT</span>
            </div>
            <div style={styles.sensorValue}>
              {reported.rssi !== undefined ? reported.rssi : -65}
              <span style={styles.sensorUnit}>dBm</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: '75%',
                  background: 'linear-gradient(90deg, #16a34a, #4ade80)'
                }}
              />
            </div>
          </div>
        </div>

        {/* Tiêu đề cụm điều khiển thiết bị */}
        <div style={styles.controlsHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sliders size={13} color="#38bdf8" />
            <span style={{ fontSize: '11px', fontWeight: 800, letterSpacing: '0.4px', color: '#94a3b8' }}>
              ĐIỀU KHIỂN THIẾT BỊ (RPC)
            </span>
          </div>
          <span style={{ fontSize: '9px', fontWeight: 600, color: '#64748b' }}>ĐỒNG BỘ 2 CHIỀU</span>
        </div>

        {/* Danh sách 6 Thẻ Công tắc Thiết bị Smart Home */}
        <div style={styles.actuatorList}>
          {smartDevices.map((dev) => {
            const isFan = dev.type === 'fan';
            const isAlarm = dev.type === 'alarm';
            const activeColor = isAlarm ? '#ef4444' : isFan ? '#38bdf8' : '#facc15';
            const currentFanSpeed =
              reported.fan_speed !== undefined
                ? reported.fan_speed
                : reported.fan_kitchen
                ? 3
                : 0;

            if (isFan) {
              const fanSpeedBadgeText = () => {
                switch (currentFanSpeed) {
                  case 1:
                    return 'MỨC 1 (PWM 40%)';
                  case 2:
                    return 'MỨC 2 (PWM 75%)';
                  case 3:
                    return 'TURBO (PWM 100%)';
                  default:
                    return 'ĐANG TẮT';
                }
              };

              return (
                <div
                  key={dev.id}
                  style={{
                    ...styles.actuatorCard,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '8px',
                    borderColor:
                      currentFanSpeed > 0
                        ? 'rgba(56, 189, 248, 0.45)'
                        : 'rgba(255, 255, 255, 0.08)',
                    background:
                      currentFanSpeed > 0
                        ? 'rgba(14, 165, 233, 0.12)'
                        : 'rgba(30, 41, 59, 0.45)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={styles.actuatorLeft}>
                      <div
                        style={{
                          ...styles.actuatorIconBox,
                          backgroundColor:
                            currentFanSpeed > 0
                              ? 'rgba(56, 189, 248, 0.2)'
                              : 'rgba(15, 23, 42, 0.6)',
                          boxShadow: currentFanSpeed > 0 ? '0 0 12px #38bdf8' : 'none'
                        }}
                      >
                        <Fan
                          size={15}
                          color={currentFanSpeed > 0 ? '#38bdf8' : '#64748b'}
                          style={
                            currentFanSpeed > 0
                              ? { animation: `spin ${2.2 / currentFanSpeed}s linear infinite` }
                              : {}
                          }
                        />
                      </div>
                      <div>
                        <div style={styles.actuatorTitle}>{dev.label}</div>
                        <div style={styles.actuatorSub}>{dev.room}</div>
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 800,
                        color: currentFanSpeed > 0 ? '#38bdf8' : '#64748b'
                      }}
                    >
                      {fanSpeedBadgeText()}
                    </span>
                  </div>

                  {/* 4 Nút Chọn Cấp Độ Gió PWM */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '4px', marginTop: '2px' }}>
                    {[
                      { lvl: 0, label: 'Tắt' },
                      { lvl: 1, label: 'Mức 1' },
                      { lvl: 2, label: 'Mức 2' },
                      { lvl: 3, label: 'Turbo' }
                    ].map((item) => {
                      const isSelected = currentFanSpeed === item.lvl;
                      return (
                        <button
                          key={item.lvl}
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggle('setFan', item.lvl);
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '8px',
                            border: isSelected
                              ? '1px solid #38bdf8'
                              : '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: isSelected ? '#0284c7' : 'rgba(15, 23, 42, 0.6)',
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
                </div>
              );
            }

            return (
              <div
                key={dev.id}
                onClick={() => onToggle(dev.method, !dev.isLit)}
                style={{
                  ...styles.actuatorCard,
                  borderColor: dev.isLit
                    ? isAlarm
                      ? 'rgba(239, 68, 68, 0.6)'
                      : 'rgba(250, 204, 21, 0.5)'
                    : 'rgba(255, 255, 255, 0.08)',
                  background: dev.isLit
                    ? isAlarm
                      ? 'rgba(239, 68, 68, 0.18)'
                      : 'rgba(234, 179, 8, 0.1)'
                    : 'rgba(30, 41, 59, 0.45)'
                }}
              >
                <div style={styles.actuatorLeft}>
                  <div
                    style={{
                      ...styles.actuatorIconBox,
                      backgroundColor: dev.isLit
                        ? isAlarm
                          ? 'rgba(239, 68, 68, 0.25)'
                          : 'rgba(250, 204, 21, 0.2)'
                        : 'rgba(15, 23, 42, 0.6)',
                      boxShadow: dev.isLit ? `0 0 12px ${activeColor}` : 'none'
                    }}
                  >
                    {isAlarm ? (
                      <Bell
                        size={15}
                        color={dev.isLit ? '#ef4444' : '#64748b'}
                        style={dev.isLit ? { animation: 'pulse 0.8s infinite' } : {}}
                      />
                    ) : (
                      <Lightbulb size={15} color={dev.isLit ? '#facc15' : '#64748b'} />
                    )}
                  </div>
                  <div>
                    <div style={styles.actuatorTitle}>{dev.label}</div>
                    <div style={styles.actuatorSub}>{dev.room}</div>
                  </div>
                </div>

                <div style={styles.actuatorRight}>
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 800,
                      color: dev.isLit ? activeColor : '#64748b',
                      marginRight: '8px'
                    }}
                  >
                    {dev.isLit ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                  </span>
                  <div
                    style={{
                      ...styles.switchTrack,
                      backgroundColor: dev.isLit ? activeColor : '#334155'
                    }}
                  >
                    <div
                      style={{
                        ...styles.switchThumb,
                        transform: dev.isLit ? 'translateX(16px)' : 'translateX(0)'
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* 4. THANH ĐIỀU HƯỚNG GÓC NHÌN ĐÁY TRANG VỚI 6 NÚT CHUẨN ĐẶC TẢ (GIỐNG ẢNH MẪU) */}
      <nav style={styles.cameraToolbar}>
        {/* Nút 1: Toàn cảnh 3D */}
        <button
          onClick={() => setViewMode('overview')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'overview' ? '#0284c7' : 'transparent',
            color: viewMode === 'overview' ? '#ffffff' : '#cbd5e1'
          }}
          title="Toàn cảnh 3D căn hộ góc nhìn Isometric"
        >
          <Compass size={14} />
          <span>Toàn cảnh 3D</span>
        </button>

        {/* Nút 2: Mặt bằng 2D */}
        <button
          onClick={() => setViewMode('top')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'top' ? '#0284c7' : 'transparent',
            color: viewMode === 'top' ? '#ffffff' : '#cbd5e1'
          }}
          title="Mặt cắt từ trên xuống (Mặt bằng 2D)"
        >
          <Eye size={14} />
          <span>Mặt bằng 2D</span>
        </button>

        {/* Nút 3: Vào Phòng khách */}
        <button
          onClick={() => setViewMode('living')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'living' ? '#0284c7' : 'transparent',
            color: viewMode === 'living' ? '#ffffff' : '#cbd5e1'
          }}
          title="Góc nhìn người thứ nhất (First-Person 360°) - Phòng khách"
        >
          <Tv size={14} />
          <span>Vào Phòng khách</span>
        </button>

        {/* Nút 4: Vào Phòng ngủ */}
        <button
          onClick={() => setViewMode('bedroom')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'bedroom' ? '#0284c7' : 'transparent',
            color: viewMode === 'bedroom' ? '#ffffff' : '#cbd5e1'
          }}
          title="Góc nhìn người thứ nhất (First-Person 360°) - Phòng ngủ"
        >
          <Bed size={14} />
          <span>Vào Phòng ngủ</span>
        </button>

        {/* Nút 5: Vào Phòng bếp */}
        <button
          onClick={() => setViewMode('kitchen')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'kitchen' ? '#0284c7' : 'transparent',
            color: viewMode === 'kitchen' ? '#ffffff' : '#cbd5e1'
          }}
          title="Góc nhìn người thứ nhất (First-Person 360°) - Phòng bếp"
        >
          <Utensils size={14} />
          <span>Vào Phòng bếp</span>
        </button>

        {/* Nút 6: Ra Ban công */}
        <button
          onClick={() => setViewMode('balcony')}
          style={{
            ...styles.camBtn,
            backgroundColor: viewMode === 'balcony' ? '#0284c7' : 'transparent',
            color: viewMode === 'balcony' ? '#ffffff' : '#cbd5e1',
            boxShadow: viewMode === 'balcony' ? '0 0 15px #0284c7' : 'none'
          }}
          title="Góc nhìn người thứ nhất (First-Person 360°) - Ban công ngoài trời"
        >
          <Flower2 size={14} />
          <span>Ra Ban công</span>
        </button>

        {/* Nút Phụ: Tự xoay (Chế độ Toàn cảnh) */}
        {viewMode === 'overview' && (
          <button
            onClick={() => setAutoRotate(!autoRotate)}
            style={{
              ...styles.camBtn,
              backgroundColor: autoRotate ? '#10b981' : 'transparent',
              color: autoRotate ? '#ffffff' : '#94a3b8',
              marginLeft: '4px'
            }}
            title="Tự động xoay 360 độ góc nhìn toàn cảnh"
          >
            <RotateCw size={13} style={autoRotate ? { animation: 'spin 3s linear infinite' } : {}} />
            <span>{autoRotate ? 'Dừng xoay' : 'Tự xoay'}</span>
          </button>
        )}
      </nav>

      {/* 5. WIDGET ĐỒNG BỘ THỜI TIẾT THỰC TẾ & GHI ĐÈ DEMO (GÓC PHẢI MÀN HÌNH) */}
      <div style={styles.weatherCardRight}>
        {/* Hàng Tiêu đề & Thông tin Vị trí */}
        <div style={styles.weatherHeaderRow}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px', filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.4))' }}>
              {weather.icon || '⛅'}
            </span>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.4px' }}>
                  THỜI TIẾT NGOẠI CẢNH
                </span>
                {weather.mode === 'live' && (
                  <span style={styles.weatherLiveBadge}>● LIVE</span>
                )}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                Hà Nội • {weather.weatherLabel || 'Đang cập nhật...'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Thông số Gió & Mây */}
            <div style={{ textAlign: 'right', fontSize: '10px', color: '#cbd5e1', lineHeight: '1.3' }}>
              <div>💨 {Number(weather.windSpeed || 0).toFixed(1)} km/h</div>
              <div style={{ color: '#94a3b8' }}>☁️ {Number(weather.cloudCover || 0).toFixed(0)}% mây</div>
            </div>

            {/* Nút thu gọn / mở rộng bảng thời tiết */}
            <button
              onClick={() => setIsWeatherCollapsed(!isWeatherCollapsed)}
              style={styles.weatherCollapseBtn}
              title={isWeatherCollapsed ? 'Mở rộng bảng thời tiết' : 'Thu gọn bảng thời tiết'}
            >
              {isWeatherCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
            </button>
          </div>
        </div>

        {!isWeatherCollapsed && (
          <>
            {/* Thanh So Sánh Trong Nhà (DHT11) vs Ngoài Trời (API) */}
            <div style={styles.weatherCompareRow}>
              <div style={styles.weatherCompareCol}>
                <span style={styles.weatherColSub}>NGOÀI TRỜI (API)</span>
                <div style={styles.weatherColVal}>
                  {Number(weather.outdoorTemp || 24).toFixed(1)}°C
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>
                    {Number(weather.outdoorHumidity || 70).toFixed(0)}%
                  </span>
                </div>
              </div>

              <div style={styles.weatherDeltaBadge}>
                <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700 }}>CHÊNH LỆCH</span>
                <span style={{ fontSize: '11px', fontWeight: 800, color: '#38bdf8' }}>
                  ΔT {Math.abs((reported.temperature || 27.5) - (weather.outdoorTemp || 24)).toFixed(1)}°C
                </span>
              </div>

              <div style={{ ...styles.weatherCompareCol, alignItems: 'flex-end' }}>
                <span style={styles.weatherColSub}>TRONG NHÀ (DHT11)</span>
                <div style={styles.weatherColVal}>
                  {Number(reported.temperature || 27.5).toFixed(1)}°C
                  <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 500, marginLeft: '4px' }}>
                    {Number(reported.humidity || 66).toFixed(0)}%
                  </span>
                </div>
              </div>
            </div>

            {/* 5 Nút Ghi Đè Chế Độ Thời Tiết (Dành riêng cho Thuyết trình Demo) */}
            <div style={styles.weatherDemoBar}>
              <div style={styles.weatherDemoLabel}>GHI ĐÈ KỊCH BẢN THUYẾT TRÌNH (DEMO):</div>
              <div style={styles.weatherBtnGrid}>
                {[
                  { id: 'live', icon: '🌐', label: 'Live API' },
                  { id: 'sunny_day', icon: '☀️', label: 'Nắng ngày' },
                  { id: 'sunset', icon: '🌇', label: 'Hoàng hôn' },
                  { id: 'rainy_storm', icon: '🌧️', label: 'Mưa giông' },
                  { id: 'clear_night', icon: '🌙', label: 'Ban đêm' }
                ].map((btn) => {
                  const isActive = (weather.mode || 'live') === btn.id;
                  return (
                    <button
                      key={btn.id}
                      onClick={() => onWeatherChange && onWeatherChange(btn.id)}
                      style={{
                        ...styles.weatherBtn,
                        backgroundColor: isActive ? '#0284c7' : 'rgba(15, 23, 42, 0.6)',
                        borderColor: isActive ? '#38bdf8' : 'rgba(255, 255, 255, 0.12)',
                        color: isActive ? '#ffffff' : '#cbd5e1',
                        boxShadow: isActive ? '0 0 10px rgba(56, 189, 248, 0.5)' : 'none',
                        fontWeight: isActive ? 800 : 600
                      }}
                      title={`Chuyển sang kịch bản: ${btn.label}`}
                    >
                      <span>{btn.icon}</span>
                      <span>{btn.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const styles = {
  collapseBtn: {
    position: 'absolute',
    top: '20px',
    zIndex: 60,
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '7px 13px',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255, 255, 255, 0.16)',
    borderRadius: '18px',
    color: '#e2e8f0',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
    pointerEvents: 'auto'
  },

  topStatusPillContainer: {
    position: 'absolute',
    top: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    pointerEvents: 'none',
    maxWidth: '90vw'
  },
  topStatusPill: {
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.35)',
    borderRadius: '24px',
    padding: '8px 20px',
    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.6), 0 0 15px rgba(56, 189, 248, 0.2)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '14px'
  },
  topStatusPillLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    whiteSpace: 'nowrap'
  },
  topStatusPillDivider: {
    width: '1px',
    height: '24px',
    backgroundColor: 'rgba(255, 255, 255, 0.15)'
  },
  topStatusPillRight: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    fontSize: '11px',
    color: '#94a3b8',
    fontWeight: 500,
    lineHeight: '1.25',
    whiteSpace: 'nowrap'
  },

  topAlertBanner: {
    background: 'rgba(239, 68, 68, 0.25)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(239, 68, 68, 0.65)',
    borderRadius: '24px',
    padding: '7px 20px',
    boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)',
    pointerEvents: 'auto',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    color: '#fee2e2',
    fontSize: '12px'
  },

  hudSidebar: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    width: '350px',
    maxHeight: 'calc(100vh - 40px)',
    overflowY: 'auto',
    background: 'rgba(15, 23, 42, 0.85)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '24px',
    padding: '18px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    zIndex: 50,
    display: 'flex',
    flexDirection: 'column',
    gap: '11px',
    transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease'
  },

  header: {
    paddingBottom: '8px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  livePulse: {
    width: '9px',
    height: '9px',
    borderRadius: '50%',
    backgroundColor: '#34d399',
    boxShadow: '0 0 10px #34d399'
  },
  mainTitle: {
    fontSize: '14px',
    fontWeight: 800,
    letterSpacing: '0.4px',
    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  subTitle: {
    fontSize: '10px',
    color: '#94a3b8',
    marginTop: '3px'
  },

  healthCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '13px',
    padding: '9px 13px'
  },
  healthTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '7px'
  },
  healthBarBg: {
    width: '100%',
    height: '6px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '4px',
    overflow: 'hidden'
  },
  healthBarFill: {
    height: '100%',
    transition: 'all 0.5s ease',
    borderRadius: '4px'
  },

  telemetryGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '7px'
  },
  sensorCard: {
    background: 'rgba(30, 41, 59, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '11px',
    padding: '7px 9px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px'
  },
  sensorIconRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  sensorLabel: {
    fontSize: '10px',
    color: '#94a3b8',
    fontWeight: 600
  },
  sensorValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '16px',
    fontWeight: 700,
    color: '#ffffff',
    display: 'flex',
    alignItems: 'baseline',
    gap: '4px'
  },
  sensorUnit: {
    fontSize: '10px',
    color: '#64748b',
    fontWeight: 500
  },
  miniBarBg: {
    width: '100%',
    height: '3px',
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderRadius: '2px',
    overflow: 'hidden',
    marginTop: '3px'
  },
  miniBarFill: {
    height: '100%',
    borderRadius: '2px',
    transition: 'width 0.4s ease'
  },

  weatherCardRight: {
    position: 'fixed',
    top: '20px',
    right: '20px',
    width: '320px',
    zIndex: 50,
    background: 'rgba(15, 23, 42, 0.78)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(56, 189, 248, 0.28)',
    borderRadius: '16px',
    padding: '11px 13px',
    display: 'flex',
    flexDirection: 'column',
    gap: '7px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  },
  weatherCollapseBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '6px',
    background: 'rgba(255, 255, 255, 0.08)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    color: '#94a3b8',
    cursor: 'pointer',
    padding: 0,
    transition: 'all 0.2s ease'
  },
  weatherHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  weatherLiveBadge: {
    fontSize: '8px',
    fontWeight: 800,
    padding: '1px 5px',
    borderRadius: '4px',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    color: '#34d399',
    border: '1px solid rgba(52, 211, 153, 0.4)',
    letterSpacing: '0.4px'
  },
  weatherCompareRow: {
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: '8px',
    background: 'rgba(15, 23, 42, 0.65)',
    borderRadius: '9px',
    padding: '5px 9px',
    border: '1px solid rgba(255, 255, 255, 0.06)'
  },
  weatherCompareCol: {
    display: 'flex',
    flexDirection: 'column'
  },
  weatherColSub: {
    fontSize: '8px',
    color: '#94a3b8',
    fontWeight: 700,
    letterSpacing: '0.3px'
  },
  weatherColVal: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '13px',
    fontWeight: 800,
    color: '#f8fafc',
    display: 'flex',
    alignItems: 'center'
  },
  weatherDeltaBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '2px 7px',
    background: 'rgba(56, 189, 248, 0.12)',
    border: '1px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '7px'
  },
  weatherDemoBar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '2px'
  },
  weatherDemoLabel: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.4px'
  },
  weatherBtnGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '3px'
  },
  weatherBtn: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '2px',
    padding: '4px 1px',
    borderRadius: '7px',
    border: '1px solid',
    fontSize: '9px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  },

  controlsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px'
  },
  actuatorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  actuatorCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid',
    borderRadius: '11px',
    padding: '7px 11px',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  actuatorLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '9px'
  },
  actuatorIconBox: {
    width: '28px',
    height: '28px',
    borderRadius: '7px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease'
  },
  actuatorTitle: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#ffffff'
  },
  actuatorSub: {
    fontSize: '9px',
    color: '#64748b'
  },
  actuatorRight: {
    display: 'flex',
    alignItems: 'center'
  },
  switchTrack: {
    width: '32px',
    height: '17px',
    borderRadius: '11px',
    padding: '2px',
    transition: 'background-color 0.25s ease',
    display: 'flex',
    alignItems: 'center'
  },
  switchThumb: {
    width: '13px',
    height: '13px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  cameraToolbar: {
    position: 'absolute',
    bottom: '22px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(15, 23, 42, 0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
    borderRadius: '26px',
    padding: '5px 8px',
    boxShadow: '0 12px 35px rgba(0, 0, 0, 0.6), 0 0 20px rgba(2, 132, 199, 0.2)',
    pointerEvents: 'auto',
    maxWidth: '96vw',
    overflowX: 'auto'
  },
  camBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: '18px',
    padding: '7px 13px',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    whiteSpace: 'nowrap'
  }
};
