import React from 'react';
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
  RotateCw,
  Compass,
  Eye,
  Sliders,
  Tv,
  Utensils
} from 'lucide-react';

export default function TwinHUD({
  twinData,
  onToggle,
  cameraMode,
  setCameraMode,
  autoRotate,
  setAutoRotate
}) {
  const reported = twinData.reported || {};
  const mismatch = twinData.mismatch || {};
  const healthScore = twinData.health_score !== undefined ? twinData.health_score : 100;

  // Danh mục 5 thiết bị Smart Home điều khiển hai chiều RPC
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
      label: 'Quạt treo tường bếp',
      room: 'Hệ thống quạt thông minh gắn tường',
      method: 'setFan',
      isLit: reported.fan_kitchen === 1,
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

  return (
    <>
      {/* 1. BANNER CẢNH BÁO SAI LỆCH VẬT LÝ MISMATCH PHÍA TRÊN */}
      {mismatch.detected && (
        <div style={styles.topAlertBanner}>
          <div style={styles.alertContent}>
            <AlertTriangle size={20} color="#f87171" style={{ animation: 'pulse 1s infinite' }} />
            <span>
              <b>CẢNH BÁO SAI LỆCH (ACTUATOR MISMATCH):</b> Trạng thái công tắc cơ tại phòng lệch với lệnh trên Web! Điểm sức khỏe $H(t)$ hạ còn 60%.
            </span>
          </div>
        </div>
      )}

      {/* 2. BẢNG ĐIỀU KHIỂN GLASSMORPHISM CAO CẤP GÓC TRÁI */}
      <aside style={styles.hudSidebar}>
        {/* Header thông tin căn hộ */}
        <div style={styles.header}>
          <div>
            <div style={styles.titleRow}>
              <span style={styles.livePulse} />
              <h1 style={styles.mainTitle}>SMART HOME DIGITAL TWIN</h1>
            </div>
            <p style={styles.subTitle}>Mô hình 3D Căn hộ Thực tế • IoT Real-time</p>
          </div>
        </div>

        {/* Thanh trạng thái Sức khỏe bản sao số H(t) */}
        <div style={styles.healthCard}>
          <div style={styles.healthTopRow}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Activity size={16} color={healthScore >= 80 ? '#34d399' : '#f87171'} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Sức khỏe Twin H(t)</span>
            </div>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: '14px',
                fontWeight: 800,
                color: healthScore >= 80 ? '#34d399' : '#f87171'
              }}
            >
              {healthScore}%
            </span>
          </div>
          <div style={styles.healthBarBg}>
            <div
              style={{
                ...styles.healthBarFill,
                width: `${healthScore}%`,
                backgroundColor: healthScore >= 80 ? '#10b981' : '#ef4444',
                boxShadow: healthScore >= 80 ? '0 0 10px #10b981' : '0 0 10px #ef4444'
              }}
            />
          </div>
        </div>

        {/* Lưới 2x2 Cảm biến Môi trường Thông minh */}
        <div style={styles.telemetryGrid}>
          {/* Nhiệt độ */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Thermometer size={16} color="#fb7185" />
              <span style={styles.sensorLabel}>Nhiệt độ phòng</span>
            </div>
            <div style={styles.sensorValue}>
              {Number(reported.temperature !== undefined ? reported.temperature : 27.8).toFixed(1)}
              <span style={styles.sensorUnit}>°C</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: `${Math.min(100, ((reported.temperature || 27.8) / 45) * 100)}%`,
                  background: 'linear-gradient(90deg, #f43f5e, #fb7185)'
                }}
              />
            </div>
          </div>

          {/* Độ ẩm */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Droplets size={16} color="#38bdf8" />
              <span style={styles.sensorLabel}>Độ ẩm không khí</span>
            </div>
            <div style={styles.sensorValue}>
              {Number(reported.humidity !== undefined ? reported.humidity : 66.3).toFixed(0)}
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
              <Sun size={16} color="#facc15" />
              <span style={styles.sensorLabel}>Ánh sáng tự nhiên</span>
            </div>
            <div style={styles.sensorValue}>
              {reported.light_level !== undefined ? reported.light_level : 10}
              <span style={styles.sensorUnit}>%</span>
            </div>
            <div style={styles.miniBarBg}>
              <div
                style={{
                  ...styles.miniBarFill,
                  width: `${Math.min(100, reported.light_level || 10)}%`,
                  background: 'linear-gradient(90deg, #ca8a04, #facc15)'
                }}
              />
            </div>
          </div>

          {/* Sóng Wi-Fi */}
          <div style={styles.sensorCard}>
            <div style={styles.sensorIconRow}>
              <Wifi size={16} color="#4ade80" />
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
            <Sliders size={14} color="#38bdf8" />
            <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.5px', color: '#94a3b8' }}>
              ĐIỀU KHIỂN THIẾT BỊ (RPC)
            </span>
          </div>
        </div>

        {/* Danh sách 5 Thẻ Công tắc Thiết bị Smart Home */}
        <div style={styles.actuatorList}>
          {smartDevices.map((dev) => {
            const isFan = dev.type === 'fan';
            const isAlarm = dev.type === 'alarm';
            const activeColor = isAlarm ? '#ef4444' : (isFan ? '#38bdf8' : '#facc15');
            const currentFanSpeed = reported.fan_speed !== undefined ? reported.fan_speed : (reported.fan_kitchen ? 3 : 0);

            if (isFan) {
              return (
                <div
                  key={dev.id}
                  style={{
                    ...styles.actuatorCard,
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    gap: '8px',
                    borderColor: currentFanSpeed > 0 ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255, 255, 255, 0.08)',
                    background: currentFanSpeed > 0 ? 'rgba(14, 165, 233, 0.12)' : 'rgba(30, 41, 59, 0.45)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={styles.actuatorLeft}>
                      <div
                        style={{
                          ...styles.actuatorIconBox,
                          backgroundColor: currentFanSpeed > 0 ? 'rgba(56, 189, 248, 0.2)' : 'rgba(15, 23, 42, 0.6)',
                          boxShadow: currentFanSpeed > 0 ? '0 0 12px #38bdf8' : 'none'
                        }}
                      >
                        <Fan
                          size={16}
                          color={currentFanSpeed > 0 ? '#38bdf8' : '#64748b'}
                          style={currentFanSpeed > 0 ? { animation: `spin ${2.2 / currentFanSpeed}s linear infinite` } : {}}
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
                        fontWeight: 700,
                        color: currentFanSpeed > 0 ? '#38bdf8' : '#64748b'
                      }}
                    >
                      {currentFanSpeed === 0 ? 'ĐANG TẮT' : `MỨC ${currentFanSpeed}${currentFanSpeed === 3 ? ' (TURBO)' : ''}`}
                    </span>
                  </div>

                  {/* 4 Nút Chọn Cấp Độ Gió PWM */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1.2fr', gap: '5px', marginTop: '2px' }}>
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
                            border: isSelected ? '1px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                            backgroundColor: isSelected ? '#0284c7' : 'rgba(15, 23, 42, 0.6)',
                            color: isSelected ? '#ffffff' : '#94a3b8',
                            fontSize: '10px',
                            fontWeight: isSelected ? 700 : 500,
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
                  borderColor: dev.isLit ? (isAlarm ? 'rgba(239, 68, 68, 0.6)' : isFan ? 'rgba(56, 189, 248, 0.5)' : 'rgba(250, 204, 21, 0.5)') : 'rgba(255, 255, 255, 0.08)',
                  background: dev.isLit ? (isAlarm ? 'rgba(239, 68, 68, 0.18)' : isFan ? 'rgba(14, 165, 233, 0.12)' : 'rgba(234, 179, 8, 0.1)') : 'rgba(30, 41, 59, 0.45)'
                }}
              >
                <div style={styles.actuatorLeft}>
                  <div
                    style={{
                      ...styles.actuatorIconBox,
                      backgroundColor: dev.isLit ? (isAlarm ? 'rgba(239, 68, 68, 0.25)' : isFan ? 'rgba(56, 189, 248, 0.2)' : 'rgba(250, 204, 21, 0.2)') : 'rgba(15, 23, 42, 0.6)',
                      boxShadow: dev.isLit ? `0 0 12px ${activeColor}` : 'none'
                    }}
                  >
                    {isAlarm ? (
                      <Bell size={16} color={dev.isLit ? '#ef4444' : '#64748b'} style={dev.isLit ? { animation: 'pulse 0.8s infinite' } : {}} />
                    ) : isFan ? (
                      <Fan size={16} color={dev.isLit ? '#38bdf8' : '#64748b'} style={dev.isLit ? { animation: 'spin 1.5s linear infinite' } : {}} />
                    ) : (
                      <Lightbulb size={16} color={dev.isLit ? '#facc15' : '#64748b'} />
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
                      fontWeight: 700,
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

      {/* 3. THANH ĐIỀU HƯỚNG GÓC NHÌN CAMERA PHÍA DƯỚI */}
      <nav style={styles.cameraToolbar}>
        <button
          onClick={() => setCameraMode('iso')}
          style={{
            ...styles.camBtn,
            backgroundColor: cameraMode === 'iso' ? '#0284c7' : 'rgba(15, 23, 42, 0.7)'
          }}
          title="Toàn cảnh 3D căn hộ góc nhìn Isometric"
        >
          <Compass size={15} />
          <span>Toàn cảnh 3D</span>
        </button>

        <button
          onClick={() => setCameraMode('top')}
          style={{
            ...styles.camBtn,
            backgroundColor: cameraMode === 'top' ? '#0284c7' : 'rgba(15, 23, 42, 0.7)'
          }}
          title="Mặt cắt từ trên xuống (Mặt bằng 2D)"
        >
          <Eye size={15} />
          <span>Mặt bằng 2D</span>
        </button>

        <button
          onClick={() => setCameraMode('living')}
          style={{
            ...styles.camBtn,
            backgroundColor: cameraMode === 'living' ? '#0284c7' : 'rgba(15, 23, 42, 0.7)'
          }}
          title="Cận cảnh Phòng khách"
        >
          <Tv size={15} />
          <span>Phòng khách</span>
        </button>

        <button
          onClick={() => setCameraMode('kitchen')}
          style={{
            ...styles.camBtn,
            backgroundColor: cameraMode === 'kitchen' ? '#0284c7' : 'rgba(15, 23, 42, 0.7)'
          }}
          title="Cận cảnh Phòng bếp"
        >
          <Utensils size={15} />
          <span>Phòng bếp</span>
        </button>

        <button
          onClick={() => setAutoRotate(!autoRotate)}
          style={{
            ...styles.camBtn,
            backgroundColor: autoRotate ? '#10b981' : 'rgba(15, 23, 42, 0.7)'
          }}
          title="Tự động xoay 360 độ"
        >
          <RotateCw size={15} style={autoRotate ? { animation: 'spin 3s linear infinite' } : {}} />
          <span>{autoRotate ? 'Dừng xoay' : 'Tự xoay'}</span>
        </button>
      </nav>
    </>
  );
}

const styles = {
  topAlertBanner: {
    position: 'absolute',
    top: '16px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 100,
    background: 'rgba(239, 68, 68, 0.25)',
    backdropFilter: 'blur(16px)',
    border: '1px solid rgba(239, 68, 68, 0.6)',
    borderRadius: '30px',
    padding: '8px 24px',
    boxShadow: '0 0 25px rgba(239, 68, 68, 0.4)',
    pointerEvents: 'auto'
  },
  alertContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
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
    background: 'rgba(15, 23, 42, 0.76)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '24px',
    padding: '20px',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
    zIndex: 50,
    pointerEvents: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
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
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    backgroundColor: '#34d399',
    boxShadow: '0 0 10px #34d399'
  },
  mainTitle: {
    fontSize: '15px',
    fontWeight: 800,
    letterSpacing: '0.5px',
    background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    margin: 0
  },
  subTitle: {
    fontSize: '11px',
    color: '#94a3b8',
    marginTop: '3px'
  },

  healthCard: {
    background: 'rgba(30, 41, 59, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '14px',
    padding: '10px 14px'
  },
  healthTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px'
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
    gap: '8px'
  },
  sensorCard: {
    background: 'rgba(30, 41, 59, 0.45)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '12px',
    padding: '8px 10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '3px'
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
    fontSize: '17px',
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

  controlsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2px'
  },
  actuatorList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '7px'
  },
  actuatorCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    border: '1px solid',
    borderRadius: '12px',
    padding: '8px 12px',
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  },
  actuatorLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  actuatorIconBox: {
    width: '30px',
    height: '30px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.25s ease'
  },
  actuatorTitle: {
    fontSize: '12px',
    fontWeight: 700,
    color: '#ffffff'
  },
  actuatorSub: {
    fontSize: '10px',
    color: '#64748b'
  },
  actuatorRight: {
    display: 'flex',
    alignItems: 'center'
  },
  switchTrack: {
    width: '34px',
    height: '18px',
    borderRadius: '12px',
    padding: '2px',
    transition: 'background-color 0.25s ease',
    display: 'flex',
    alignItems: 'center'
  },
  switchThumb: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
    backgroundColor: '#ffffff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
  },

  cameraToolbar: {
    position: 'absolute',
    bottom: '24px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 50,
    display: 'flex',
    gap: '8px',
    background: 'rgba(15, 23, 42, 0.75)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    borderRadius: '30px',
    padding: '6px 10px',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
    pointerEvents: 'auto'
  },
  camBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    border: 'none',
    borderRadius: '20px',
    padding: '7px 14px',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.25s ease'
  }
};
