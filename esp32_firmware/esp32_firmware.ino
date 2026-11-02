#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <WebServer.h>
#include <HTTPClient.h>

// =========================================================================
// 1. CẤU HÌNH WIFI, THINGSBOARD VÀ DIGITAL TWIN BACKEND
// =========================================================================
const char* WIFI_SSID = "Tuan Anh";        // Tên Wi-Fi (hoặc Hotspot 2.4GHz)
const char* WIFI_PASS = "ducloi71";        // Mật khẩu Wi-Fi

// ThingsBoard Cloud
const char* TB_SERVER = "thingsboard.cloud";
const int   TB_PORT   = 1883;
const char* TB_TOKEN  = "XiP9UJASXyIQd3aBzzfr";  // Access Token thiết bị ESP32_IOT

// Địa chỉ IP máy tính đang chạy mô hình 3D (Cổng 5000 của Backend)
// Lưu ý: Nếu đổi mạng Wi-Fi khác, mở CMD gõ 'ipconfig' để lấy IPv4 máy tính và điền vào đây.
const char* BACKEND_SERVER = "http://192.168.100.3:5000";

// =========================================================================
// 2. ĐỊNH NGHĨA CHÂN GPIO THIẾT BỊ VẬT LÝ
// =========================================================================
#define PIN_LED_LIVING   19   // Đèn LED Phòng khách
#define PIN_LED_BED      18   // Đèn LED Phòng ngủ
#define PIN_LED_KIT       5   // Đèn LED Bếp
#define PIN_LED_BAL      17   // Đèn LED Ban công
#define PIN_FAN_PWM      16   // Quạt 4010 qua MOSFET D4184 (PWM)
#define PIN_BUZZER_ALARM 23   // Còi chíp Active Buzzer báo cháy
#define PIN_DHT          15   // Cảm biến nhiệt ẩm DHT11
#define PIN_LDR          34   // Cảm biến quang trở LDR (Analog 0-4095)

// 4 Công tắc cơ vật lý tại 4 phòng
#define PIN_BTN_LIVING    4   // Công tắc Phòng khách
#define PIN_BTN_BED      21   // Công tắc Phòng ngủ
#define PIN_BTN_KIT      22   // Công tắc Bếp
#define PIN_BTN_BAL      27   // Công tắc Ban công

// =========================================================================
// 3. CẤU HÌNH PWM QUẠT BRUSHLESS 4010 (CHỐNG KÊU RÍT)
// =========================================================================
#define PWM_CHANNEL       0
#define PWM_FREQ         30   // Tần số 30 Hz để chip quạt Brushless không bị nghẽn
#define PWM_RESOLUTION    8   // Độ phân giải 8-bit (0 - 255)

// Khởi tạo cảm biến DHT11
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

// MQTT & WebServer Client
WiFiClient espClient;
PubSubClient client(espClient);
WebServer localServer(80);    // Web Server nội bộ nhận lệnh RPC tức thì từ 3D Web

// Biến trạng thái Actuator
unsigned long lastSend = 0;
bool st_living = false;
bool st_bed = false;
bool st_kit = false;
bool st_bal = false;
int  fan_speed = 0;           // Cấp độ gió: 0 (Tắt), 1 (Êm), 2 (Vừa), 3 (Turbo)
bool st_alarm = false;

// =========================================================================
// 4. HÀM ĐIỀU KHIỂN TỐC ĐỘ QUẠT (KICK-START CHỐNG KẸT)
// =========================================================================
void setFanSpeed(int level) {
  if (level < 0) level = 0;
  if (level > 3) level = 3;
  fan_speed = level;

  if (fan_speed == 0) {
    #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
      ledcWrite(PIN_FAN_PWM, 0);
    #else
      ledcWrite(PWM_CHANNEL, 0);
    #endif
    Serial.println(">> [QUẠT 4010] Đã TẮT (0%)");
    return;
  }

  // Tuyệt chiêu Kick-start 150ms để quạt thắng ma sát tĩnh ban đầu
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWrite(PIN_FAN_PWM, 255);
    delay(150);
  #else
    ledcWrite(PWM_CHANNEL, 255);
    delay(150);
  #endif

  int dutyCycle = 0;
  switch (fan_speed) {
    case 1: dutyCycle = 150; break; // Mức 1: Êm dịu (~60% PWM)
    case 2: dutyCycle = 200; break; // Mức 2: Tiêu chuẩn (~80% PWM)
    case 3: dutyCycle = 255; break; // Mức 3: Turbo cực đại (100% PWM)
  }

  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWrite(PIN_FAN_PWM, dutyCycle);
  #else
    ledcWrite(PWM_CHANNEL, dutyCycle);
  #endif

  Serial.printf(">> [QUẠT 4010] Cấp độ: %d | PWM Duty: %d/255\n", fan_speed, dutyCycle);
}

// =========================================================================
// 5. ĐỒNG BỘ DỮ LIỆU ĐẾN DIGITAL TWIN LOCAL VÀ CLOUD
// =========================================================================
// Gửi trực tiếp tới máy tính chạy giao diện 3D qua mạng LAN (Độ trễ <15ms)
void sendToLocalTwin(const char* jsonPayload) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(String(BACKEND_SERVER) + "/api/telemetry");
    http.addHeader("Content-Type", "application/json");
    http.setTimeout(500); // 500ms timeout an toàn, không bao giờ chặn luồng chính
    int httpCode = http.POST(jsonPayload);
    http.end();
  }
}

// Gửi Telemetry đồng thời lên ThingsBoard Cloud và 3D Digital Twin
void sendReadBackState() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 27.8;
  if (isnan(hum))  hum = 66.0;

  int rawLdr = analogRead(PIN_LDR);
  int lightPercent = map(rawLdr, 0, 4095, 100, 0);
  if (lightPercent < 0) lightPercent = 0;
  if (lightPercent > 100) lightPercent = 100;

  int rssi = WiFi.RSSI();

  StaticJsonDocument<400> doc;
  doc["light_living"]  = digitalRead(PIN_LED_LIVING) == HIGH ? 1 : 0;
  doc["light_bed"]     = digitalRead(PIN_LED_BED)    == HIGH ? 1 : 0;
  doc["light_kitchen"] = digitalRead(PIN_LED_KIT)    == HIGH ? 1 : 0;
  doc["light_balcony"] = digitalRead(PIN_LED_BAL)    == HIGH ? 1 : 0;
  doc["fan_kitchen"]   = (fan_speed > 0) ? 1 : 0;
  doc["fan_speed"]     = fan_speed;
  doc["fire_alarm"]    = digitalRead(PIN_BUZZER_ALARM) == HIGH ? 1 : 0;
  doc["temperature"]   = temp;
  doc["humidity"]      = hum;
  doc["light_level"]   = lightPercent;
  doc["rssi"]          = rssi;
  doc["ip"]            = WiFi.localIP().toString(); // Báo IP để Backend tự động gửi lệnh

  char buffer[450];
  serializeJson(doc, buffer);

  // 1. Gửi lên ThingsBoard Cloud qua MQTT
  if (client.connected()) {
    client.publish("v1/devices/me/telemetry", buffer);
  }

  // 2. Gửi đồng bộ siêu tốc tới Web 3D Digital Twin
  sendToLocalTwin(buffer);

  Serial.print(">> [Twin Telemetry Đồng Bộ]: ");
  Serial.println(buffer);
}

// =========================================================================
// 6. XỬ LÝ LỆNH RPC ĐIỀU KHIỂN TỪ WEB 3D VÀ THINGSBOARD
// =========================================================================

// Xử lý lệnh HTTP trực tiếp từ Web 3D (Độ trễ <10ms)
void handleLocalRpc() {
  String method = localServer.arg("method");
  String paramStr = localServer.arg("params");
  int val = paramStr.toInt();

  Serial.printf("<< [3D Web Local RPC]: %s = %d\n", method.c_str(), val);

  if (method == "setLiving") {
    digitalWrite(PIN_LED_LIVING, val ? HIGH : LOW);
    st_living = val ? true : false;
  } else if (method == "setBed") {
    digitalWrite(PIN_LED_BED, val ? HIGH : LOW);
    st_bed = val ? true : false;
  } else if (method == "setKitchen") {
    digitalWrite(PIN_LED_KIT, val ? HIGH : LOW);
    st_kit = val ? true : false;
  } else if (method == "setBalcony") {
    digitalWrite(PIN_LED_BAL, val ? HIGH : LOW);
    st_bal = val ? true : false;
  } else if (method == "setFan" || method == "setFanSpeed") {
    setFanSpeed(val);
  } else if (method == "setAlarm") {
    digitalWrite(PIN_BUZZER_ALARM, val ? HIGH : LOW);
    st_alarm = val ? true : false;
  }

  localServer.sendHeader("Access-Control-Allow-Origin", "*");
  localServer.send(200, "application/json", "{\"status\": \"ok\"}");
  sendReadBackState();
}

// Xử lý các lệnh điều khiển RPC từ ThingsBoard Cloud
void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String responseTopic = String(topic);
  responseTopic.replace("request", "response");

  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);

  String method = doc["method"];
  Serial.printf("<< [ThingsBoard Cloud RPC]: %s\n", method.c_str());

  if (method == "setLiving") {
    bool val = doc["params"];
    digitalWrite(PIN_LED_LIVING, val ? HIGH : LOW);
    st_living = val;
  } else if (method == "setBed") {
    bool val = doc["params"];
    digitalWrite(PIN_LED_BED, val ? HIGH : LOW);
    st_bed = val;
  } else if (method == "setKitchen") {
    bool val = doc["params"];
    digitalWrite(PIN_LED_KIT, val ? HIGH : LOW);
    st_kit = val;
  } else if (method == "setBalcony") {
    bool val = doc["params"];
    digitalWrite(PIN_LED_BAL, val ? HIGH : LOW);
    st_bal = val;
  } else if (method == "setFan" || method == "setFanSpeed") {
    if (doc["params"].is<int>()) {
      setFanSpeed(doc["params"].as<int>());
    } else {
      bool val = doc["params"].as<bool>();
      setFanSpeed(val ? 3 : 0);
    }
  } else if (method == "setAlarm") {
    bool val = doc["params"];
    digitalWrite(PIN_BUZZER_ALARM, val ? HIGH : LOW);
    st_alarm = val;
  }

  client.publish(responseTopic.c_str(), "{\"status\": \"ok\"}");
  sendReadBackState();
}

// =========================================================================
// 7. QUÉT 4 CÔNG TẮC CƠ VẬT LÝ TẠI 4 PHÒNG (DEBOUNCE 40MS)
// =========================================================================
void checkPhysicalButtons() {
  static int lastLiving = HIGH;
  static int lastBed    = HIGH;
  static int lastKit    = HIGH;
  static int lastBal    = HIGH;

  int bLiving = digitalRead(PIN_BTN_LIVING);
  int bBed    = digitalRead(PIN_BTN_BED);
  int bKit    = digitalRead(PIN_BTN_KIT);
  int bBal    = digitalRead(PIN_BTN_BAL);

  bool changed = false;

  // 1. Công tắc Phòng khách
  if (bLiving == LOW && lastLiving == HIGH) {
    delay(40);
    if (digitalRead(PIN_BTN_LIVING) == LOW) {
      st_living = !st_living;
      digitalWrite(PIN_LED_LIVING, st_living ? HIGH : LOW);
      Serial.printf("[CÔNG TẮC BREADBOARD] Phòng khách -> %s\n", st_living ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastLiving = bLiving;

  // 2. Công tắc Phòng ngủ
  if (bBed == LOW && lastBed == HIGH) {
    delay(40);
    if (digitalRead(PIN_BTN_BED) == LOW) {
      st_bed = !st_bed;
      digitalWrite(PIN_LED_BED, st_bed ? HIGH : LOW);
      Serial.printf("[CÔNG TẮC BREADBOARD] Phòng ngủ -> %s\n", st_bed ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastBed = bBed;

  // 3. Công tắc Bếp
  if (bKit == LOW && lastKit == HIGH) {
    delay(40);
    if (digitalRead(PIN_BTN_KIT) == LOW) {
      st_kit = !st_kit;
      digitalWrite(PIN_LED_KIT, st_kit ? HIGH : LOW);
      Serial.printf("[CÔNG TẮC BREADBOARD] Bếp -> %s\n", st_kit ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastKit = bKit;

  // 4. Công tắc Ban công
  if (bBal == LOW && lastBal == HIGH) {
    delay(40);
    if (digitalRead(PIN_BTN_BAL) == LOW) {
      st_bal = !st_bal;
      digitalWrite(PIN_LED_BAL, st_bal ? HIGH : LOW);
      Serial.printf("[CÔNG TẮC BREADBOARD] Ban công -> %s\n", st_bal ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastBal = bBal;

  if (changed) {
    sendReadBackState();
  }
}

// =========================================================================
// 8. KẾT NỐI VÀ TÁI KẾT NỐI MQTT THINGSBOARD
// =========================================================================
void reconnect() {
  if (!client.connected()) {
    Serial.print("Dang ket noi ThingsBoard...");
    if (client.connect("ESP32_SmartHome_Node", TB_TOKEN, NULL)) {
      Serial.println(" Thanh cong!");
      client.subscribe("v1/devices/me/rpc/request/+");
      sendReadBackState();
    } else {
      Serial.print(" That bai, rc=");
      Serial.print(client.state());
      Serial.println(". Se thu lai o vong lap tiep theo...");
    }
  }
}

// =========================================================================
// 9. SETUP KHỞI ĐỘNG HỆ THỐNG
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(500);
  Serial.println("\n==============================================");
  Serial.println("   KHOI DONG HE THONG SMART HOME DIGITAL TWIN ");
  Serial.println("==============================================");

  dht.begin();

  // Cấu hình chân Đèn & Còi
  pinMode(PIN_LED_LIVING,   OUTPUT);
  pinMode(PIN_LED_BED,      OUTPUT);
  pinMode(PIN_LED_KIT,      OUTPUT);
  pinMode(PIN_LED_BAL,      OUTPUT);
  pinMode(PIN_BUZZER_ALARM, OUTPUT);

  digitalWrite(PIN_LED_LIVING,   LOW);
  digitalWrite(PIN_LED_BED,      LOW);
  digitalWrite(PIN_LED_KIT,      LOW);
  digitalWrite(PIN_LED_BAL,      LOW);
  digitalWrite(PIN_BUZZER_ALARM, LOW);

  // 4 Công tắc cơ kích hoạt trở kéo lên nội (INPUT_PULLUP)
  pinMode(PIN_BTN_LIVING, INPUT_PULLUP);
  pinMode(PIN_BTN_BED,    INPUT_PULLUP);
  pinMode(PIN_BTN_KIT,    INPUT_PULLUP);
  pinMode(PIN_BTN_BAL,    INPUT_PULLUP);

  // Khởi tạo PWM điều khiển Quạt Brushless 4010
  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(PIN_FAN_PWM, PWM_FREQ, PWM_RESOLUTION);
  #else
    ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
    ledcAttachPin(PIN_FAN_PWM, PWM_CHANNEL);
  #endif
  setFanSpeed(0);

  // Kết nối Wi-Fi
  Serial.printf("Dang ket noi WiFi: %s", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi da ket noi!");
  Serial.print(">> [ESP32 IP Address]: ");
  Serial.println(WiFi.localIP());

  // Khởi chạy HTTP WebServer nội bộ nhận lệnh từ 3D Web
  localServer.on("/rpc", handleLocalRpc);
  localServer.enableCORS(true);
  localServer.begin();
  Serial.println(">> [Local Server 3D] WebServer da khoi chay tren cong 80!");

  // Cấu hình MQTT ThingsBoard
  client.setServer(TB_SERVER, TB_PORT);
  client.setCallback(onMqttMessage);

  // Gửi gói Telemetry chào sân ban đầu
  sendReadBackState();
}

// =========================================================================
// 10. VÒNG LẶP CHÍNH (LOOP)
// =========================================================================
void loop() {
  // 1. Duy trì kết nối ThingsBoard
  if (!client.connected()) {
    static unsigned long lastMqttRetry = 0;
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      reconnect();
    }
  } else {
    client.loop();
  }

  // 2. Lắng nghe lệnh điều khiển siêu tốc từ 3D Web Twin
  localServer.handleClient();

  // 3. Quét trạng thái 4 công tắc cơ trên Breadboard
  checkPhysicalButtons();

  // 4. Định kỳ gửi Telemetry (mỗi 5 giây một lần)
  unsigned long now = millis();
  if (now - lastSend > 5000) {
    lastSend = now;
    sendReadBackState();
  }
}

