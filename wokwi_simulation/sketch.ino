/*
 * =========================================================================
 * BẢN SAO MÔ PHỎNG PHẦN CỨNG WOKWI - SMART HOME IOT DIGITAL TWIN
 * =========================================================================
 * Bo mạch: ESP32 DevKit C v4
 * Kết nối Cloud: ThingsBoard Cloud (thingsboard.cloud:1883)
 * Mạng mô phỏng: Wokwi-GUEST (Không cần mật khẩu)
 * 
 * PHẦN CỨNG BẢN SAO 100% MẠCH THẬT:
 * - 4 Đèn LED: Living (D19), Bedroom (D18), Kitchen (D5), Balcony (D17)
 * - 4 Công tắc cơ: Living (D4), Bedroom (D21), Kitchen (D22), Balcony (D27)
 * - 1 Quạt PWM bếp: D16
 * - 1 Còi chíp báo cháy Active Buzzer: D23
 * - 1 Cảm biến nhiệt ẩm DHT11: D15
 * - 1 Cảm biến quang trở LDR: D34 (Analog)
 * =========================================================================
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// =========================================================================
// 1. CẤU HÌNH WIFI WOKWI VÀ THINGSBOARD CLOUD
// =========================================================================
const char* WIFI_SSID = "Wokwi-GUEST";
const char* WIFI_PASS = "";

const char* TB_SERVER = "thingsboard.cloud";
const int   TB_PORT   = 1883;
const char* TB_TOKEN  = "XiP9UJASXyIQd3aBzzfr";  // Token thiết bị của bạn

// =========================================================================
// 2. ĐỊNH NGHĨA CHÂN GPIO (GIỮ NGUYÊN 100% THEO MẠCH THẬT)
// =========================================================================
#define PIN_LED_LIVING   19   // LED Phòng khách
#define PIN_LED_BED      18   // LED Phòng ngủ
#define PIN_LED_KIT       5   // LED Bếp
#define PIN_LED_BAL      17   // LED Ban công
#define PIN_FAN_PWM      16   // Quạt PWM bếp
#define PIN_BUZZER_ALARM 23   // Còi báo cháy
#define PIN_DHT          15   // Cảm biến DHT11
#define PIN_LDR          34   // Cảm biến quang trở LDR

#define PIN_BTN_LIVING    4   // Công tắc cơ Phòng khách
#define PIN_BTN_BED      21   // Công tắc cơ Phòng ngủ
#define PIN_BTN_KIT      22   // Công tắc cơ Bếp
#define PIN_BTN_BAL      27   // Công tắc cơ Ban công

// =========================================================================
// 3. KHỞI TẠO CÁC MODULE
// =========================================================================
#define DHTTYPE DHT11
DHT dht(PIN_DHT, DHTTYPE);

#define PWM_CHANNEL       0
#define PWM_FREQ         30   // 30Hz
#define PWM_RESOLUTION    8   // 8-bit (0-255)

WiFiClient espClient;
PubSubClient client(espClient);

// Biến lưu trạng thái Actuator
bool st_living = false;
bool st_bed    = false;
bool st_kit    = false;
bool st_bal    = false;
int  fan_speed = 0;           // 0: Tắt, 1: 40%, 2: 75%, 3: 100%
bool st_alarm  = false;

unsigned long lastSend = 0;

// =========================================================================
// 4. HÀM ĐIỀU TỐC QUẠT PWM
// =========================================================================
void setFanSpeed(int level) {
  if (level < 0) level = 0;
  if (level > 3) level = 3;
  fan_speed = level;

  int dutyCycle = 0;
  switch (fan_speed) {
    case 0: dutyCycle = 0;   break;
    case 1: dutyCycle = 120; break; // Mức 1: ~40% PWM
    case 2: dutyCycle = 190; break; // Mức 2: ~75% PWM
    case 3: dutyCycle = 255; break; // Mức 3: 100% PWM Turbo
  }

  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcWrite(PIN_FAN_PWM, dutyCycle);
  #else
    ledcWrite(PWM_CHANNEL, dutyCycle);
  #endif

  Serial.printf(">> [WOKWI QUẠT BẾP] Cấp độ: %d | Duty PWM: %d/255\n", fan_speed, dutyCycle);
}

// =========================================================================
// 5. GỬI TELEMETRY LÊN THINGSBOARD CLOUD
// =========================================================================
void sendTelemetry() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 27.5;
  if (isnan(hum))  hum  = 66.0;

  int rawLdr = analogRead(PIN_LDR);
  int lightPercent = map(rawLdr, 0, 4095, 100, 0);
  if (lightPercent < 0) lightPercent = 0;
  if (lightPercent > 100) lightPercent = 100;

  int rssi = WiFi.RSSI();

  StaticJsonDocument<350> doc;
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

  char buffer[400];
  serializeJson(doc, buffer);

  if (client.connected()) {
    client.publish("v1/devices/me/telemetry", buffer);
    Serial.print(">> [ThingsBoard Telemetry]: ");
    Serial.println(buffer);
  }
}

// =========================================================================
// 6. NHẬN LỆNH RPC ĐIỀU KHIỂN TỪ THINGSBOARD CLOUD
// =========================================================================
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
  sendTelemetry();
}

// =========================================================================
// 7. QUÉT 4 NÚT BẤM CÔNG TẮC CƠ (DEBOUNCE 50MS)
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
    delay(50);
    if (digitalRead(PIN_BTN_LIVING) == LOW) {
      st_living = !st_living;
      digitalWrite(PIN_LED_LIVING, st_living ? HIGH : LOW);
      Serial.printf("[WOKWI NÚT CƠ] Phòng khách -> %s\n", st_living ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastLiving = bLiving;

  // 2. Công tắc Phòng ngủ
  if (bBed == LOW && lastBed == HIGH) {
    delay(50);
    if (digitalRead(PIN_BTN_BED) == LOW) {
      st_bed = !st_bed;
      digitalWrite(PIN_LED_BED, st_bed ? HIGH : LOW);
      Serial.printf("[WOKWI NÚT CƠ] Phòng ngủ -> %s\n", st_bed ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastBed = bBed;

  // 3. Công tắc Bếp
  if (bKit == LOW && lastKit == HIGH) {
    delay(50);
    if (digitalRead(PIN_BTN_KIT) == LOW) {
      st_kit = !st_kit;
      digitalWrite(PIN_LED_KIT, st_kit ? HIGH : LOW);
      Serial.printf("[WOKWI NÚT CƠ] Bếp -> %s\n", st_kit ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastKit = bKit;

  // 4. Công tắc Ban công
  if (bBal == LOW && lastBal == HIGH) {
    delay(50);
    if (digitalRead(PIN_BTN_BAL) == LOW) {
      st_bal = !st_bal;
      digitalWrite(PIN_LED_BAL, st_bal ? HIGH : LOW);
      Serial.printf("[WOKWI NÚT CƠ] Ban công -> %s\n", st_bal ? "BẬT" : "TẮT");
      changed = true;
    }
  }
  lastBal = bBal;

  if (changed) {
    sendTelemetry();
  }
}

// =========================================================================
// 8. TÁI KẾT NỐI THINGSBOARD
// =========================================================================
void reconnect() {
  if (!client.connected()) {
    Serial.print("Dang ket noi ThingsBoard Cloud...");
    if (client.connect("Wokwi_ESP32_Twin_Node", TB_TOKEN, NULL)) {
      Serial.println(" [THANH CONG!]");
      client.subscribe("v1/devices/me/rpc/request/+");
      sendTelemetry();
    } else {
      Serial.printf(" [THAT BAI], rc=%d. Thu lai sau 5s...\n", client.state());
    }
  }
}

// =========================================================================
// 9. SETUP KHỞI TẠO
// =========================================================================
void setup() {
  Serial.begin(115200);
  delay(300);
  Serial.println("\n==============================================");
  Serial.println("   WOKWI SIMULATION - SMART HOME DIGITAL TWIN ");
  Serial.println("==============================================");

  dht.begin();

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

  pinMode(PIN_BTN_LIVING, INPUT_PULLUP);
  pinMode(PIN_BTN_BED,    INPUT_PULLUP);
  pinMode(PIN_BTN_KIT,    INPUT_PULLUP);
  pinMode(PIN_BTN_BAL,    INPUT_PULLUP);

  #if defined(ESP_ARDUINO_VERSION_MAJOR) && ESP_ARDUINO_VERSION_MAJOR >= 3
    ledcAttach(PIN_FAN_PWM, PWM_FREQ, PWM_RESOLUTION);
  #else
    ledcSetup(PWM_CHANNEL, PWM_FREQ, PWM_RESOLUTION);
    ledcAttachPin(PIN_FAN_PWM, PWM_CHANNEL);
  #endif
  setFanSpeed(0);

  Serial.print("Ket noi WiFi Wokwi-GUEST: ");
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) {
    delay(400);
    Serial.print(".");
  }
  Serial.println(" [CONNECTED!]");
  Serial.print("IP ao Wokwi: ");
  Serial.println(WiFi.localIP());

  client.setServer(TB_SERVER, TB_PORT);
  client.setCallback(onMqttMessage);

  sendTelemetry();
}

// =========================================================================
// 10. VÒNG LẶP CHÍNH (LOOP)
// =========================================================================
void loop() {
  if (!client.connected()) {
    static unsigned long lastMqttRetry = 0;
    if (millis() - lastMqttRetry > 5000) {
      lastMqttRetry = millis();
      reconnect();
    }
  } else {
    client.loop();
  }

  // Quét nút bấm mô phỏng
  checkPhysicalButtons();

  // Định kỳ gửi Telemetry mỗi 5 giây
  unsigned long now = millis();
  if (now - lastSend > 5000) {
    lastSend = now;
    sendTelemetry();
  }
}

