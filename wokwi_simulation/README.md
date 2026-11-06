# HƯỚNG DẪN MÔ PHỎNG PHẦN CỨNG WOKWI (DIGITAL TWIN HARDWARE CLONE)

Dự án này là **bản sao mô phỏng số 100% của mạch phần cứng thật**, cho phép bạn chạy thử nghiệm phần cứng trên trình duyệt tại [Wokwi.com](https://wokwi.com) mà không cần cắm dây thật.

---

## 1. Danh sách linh kiện mô phỏng & Sơ đồ chân (Pinout)

| Tên linh kiện | Loại Wokwi | Chân ESP32 | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Bo mạch chính** | `board-esp32-devkit-c-v4` | - | ESP32 DevKit V4 30/38 chân |
| **Đèn Phòng Khách** | `wokwi-led` (Màu vàng) | **GPIO 19** | Qua điện trở 220Ω xuống GND |
| **Đèn Phòng Ngủ** | `wokwi-led` (Màu xanh dương) | **GPIO 18** | Qua điện trở 220Ω xuống GND |
| **Đèn Bếp** | `wokwi-led` (Màu cam/vàng) | **GPIO 5** | Qua điện trở 220Ω xuống GND |
| **Đèn Ban Công** | `wokwi-led` (Màu xanh lá) | **GPIO 17** | Qua điện trở 220Ω xuống GND |
| **Quạt PWM Bếp** | `wokwi-led` (Màu cyan) | **GPIO 16** | Đèn hiển thị mức xung PWM (0%, 40%, 75%, 100%) |
| **Còi báo cháy** | `wokwi-buzzer` | **GPIO 23** | Chân dương vào D23, chân âm vào GND |
| **Cảm biến DHT11** | `wokwi-dht11` | **GPIO 15** | SDA vào D15, VCC vào 3V3, GND vào GND |
| **Cảm biến LDR** | `wokwi-photoresistor-sensor` | **GPIO 34** | AO vào D34 (Analog), VCC 3V3, GND |
| **Công tắc Phòng khách** | `wokwi-pushbutton` (Vàng) | **GPIO 4** | Kích hoạt `INPUT_PULLUP`, nối GND |
| **Công tắc Phòng ngủ** | `wokwi-pushbutton` (Xanh dương) | **GPIO 21** | Kích hoạt `INPUT_PULLUP`, nối GND |
| **Công tắc Bếp** | `wokwi-pushbutton` (Vàng) | **GPIO 22** | Kích hoạt `INPUT_PULLUP`, nối GND |
| **Công tắc Ban công** | `wokwi-pushbutton` (Xanh lá) | **GPIO 27** | Kích hoạt `INPUT_PULLUP`, nối GND |

---

## 2. Các bước tạo dự án trên Wokwi (Chỉ mất 1 phút)

1. Mở trình duyệt và truy cập: **https://wokwi.com/projects/new/esp32**
2. **Copy file code:**
   - Mở file `wokwi_simulation/sketch.ino`, copy toàn bộ nội dung và dán vào tab **`sketch.ino`** trên Wokwi.
3. **Copy file sơ đồ mạch:**
   - Trên Wokwi, bấm vào tab **`diagram.json`**, xóa nội dung cũ, copy file `wokwi_simulation/diagram.json` và dán vào. Bạn sẽ thấy bo mạch ESP32 cùng 4 đèn LED, 4 nút bấm, DHT11, LDR, còi và quạt tự động xếp ngay ngắn và nối dây hoàn chỉnh!
4. **Khai báo thư viện:**
   - Trên Wokwi, bấm vào tab **`Library Manager`** (hoặc tạo file `libraries.txt`) và thêm 4 dòng sau:
     ```text
     PubSubClient
     ArduinoJson
     DHT sensor library
     Adafruit Unified Sensor
     ```
5. **Bấm nút Play (Start Simulation - nút màu xanh lá hình tam giác):**
   - Wokwi sẽ tự động kết nối Wi-Fi `Wokwi-GUEST`.
   - Kết nối trực tiếp tới ThingsBoard Cloud: `thingsboard.cloud:1883` với token `XiP9UJASXyIQd3aBzzfr`.
   - Bắt đầu đẩy Telemetry và sẵn sàng nhận lệnh điều khiển 2 chiều!

---

## 3. Cách thử nghiệm tương tác

1. **Bấm 4 nút công tắc cơ vật lý:**
   - Bấm nút **SW LIVING**: Đèn LED Living (D19) bật sáng, trạng thái lập tức đồng bộ lên ThingsBoard Cloud.
   - Bấm các nút **SW BED**, **SW KITCHEN**, **SW BALCONY** để bật/tắt đèn các phòng tương ứng.
2. **Kéo thanh trượt cảm biến môi trường:**
   - Bấm vào cảm biến **DHT11**: Bạn có thể kéo thay đổi Nhiệt độ và Độ ẩm, ESP32 sẽ gửi giá trị mới lên Dashboard.
   - Bấm vào cảm biến **LDR**: Kéo độ sáng Lux, hệ thống sẽ tự tính phần trăm ánh sáng (0 - 100%).
3. **Điều khiển 2 chiều từ xa:**
   - Khi bạn bấm nút điều khiển trên ThingsBoard Cloud hoặc trên Web 3D (qua Backend ThingsBoard), đèn trên mạch Wokwi sẽ lập tức sáng/tắt đồng bộ!

