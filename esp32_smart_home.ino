
#include <WiFi.h>
#include <PubSubClient.h>

// =================================
// WIFI SETTINGS
// =================================

const char* WIFI_SSID = "YOUR_WIFI_NAME";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

// =================================
// MQTT SETTINGS
// =================================

const char* MQTT_BROKER = "broker.hivemq.com";

const int MQTT_PORT = 1883;

const char* TOPIC_SET =
    "school-project/khemmachatnt2004/led26-7f3c91a2/set";

const char* TOPIC_STATE =
    "school-project/khemmachatnt2004/led26-7f3c91a2/state";

// =================================
// LED SETTINGS
// =================================

const int LED_PIN = 26;

// ถ้า LED ทำงานกลับด้าน ให้สลับ HIGH กับ LOW
const int LED_ON_LEVEL = HIGH;
const int LED_OFF_LEVEL = LOW;

bool ledState = false;

// =================================
// MQTT CLIENT
// =================================

WiFiClient espClient;

PubSubClient mqttClient(espClient);

unsigned long lastMqttAttempt = 0;

// =================================
// CONTROL LED
// =================================

void updateLED(bool isOn) {

    ledState = isOn;

    digitalWrite(
        LED_PIN,
        isOn ? LED_ON_LEVEL : LED_OFF_LEVEL
    );

    const char* state =
        isOn ? "ON" : "OFF";

    Serial.print("LED STATUS: ");
    Serial.println(state);

    if (mqttClient.connected()) {

        mqttClient.publish(
            TOPIC_STATE,
            state,
            true
        );

    }
}

// =================================
// RECEIVE MQTT COMMAND
// =================================

void callback(
    char* topic,
    byte* payload,
    unsigned int length
) {

    String command = "";

    for (unsigned int i = 0; i < length; i++) {

        command += (char)payload[i];

    }

    Serial.print("Received command: ");
    Serial.println(command);

    if (String(topic) == TOPIC_SET) {

        if (command == "ON") {

            updateLED(true);

        }

        else if (command == "OFF") {

            updateLED(false);

        }

    }

}

// =================================
// CONNECT WIFI
// =================================

void connectWiFi() {

    Serial.print("Connecting to WiFi");

    WiFi.mode(WIFI_STA);

    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    while (WiFi.status() != WL_CONNECTED) {

        delay(500);

        Serial.print(".");

    }

    Serial.println();

    Serial.println("WiFi Connected!");

    Serial.print("IP Address: ");

    Serial.println(WiFi.localIP());

}

// =================================
// CONNECT MQTT
// =================================

void connectMQTT() {

    String clientId =
        "SmartHomeESP32-" +
        String(
            (uint32_t)(ESP.getEfuseMac() & 0xFFFFFFFF),
            HEX
        );

    Serial.println("Connecting to MQTT...");

    if (mqttClient.connect(clientId.c_str())) {

        Serial.println("MQTT Connected!");

        mqttClient.subscribe(TOPIC_SET);

        Serial.println("Subscribed to LED command topic!");

        // Send current LED status to website
        mqttClient.publish(
            TOPIC_STATE,
            ledState ? "ON" : "OFF",
            true
        );

    }

    else {

        Serial.print("MQTT connection failed. State: ");

        Serial.println(mqttClient.state());

    }

}

// =================================
// SETUP
// =================================

void setup() {

    Serial.begin(115200);

    pinMode(LED_PIN, OUTPUT);

    // Start with LED OFF
    digitalWrite(LED_PIN, LED_OFF_LEVEL);

    ledState = false;

    // Connect WiFi
    connectWiFi();

    // MQTT configuration
    mqttClient.setServer(
        MQTT_BROKER,
        MQTT_PORT
    );

    mqttClient.setCallback(callback);

    mqttClient.setBufferSize(256);

    mqttClient.setKeepAlive(30);

    // Connect MQTT
    connectMQTT();

}

// =================================
// MAIN LOOP
// =================================

void loop() {

    if (WiFi.status() != WL_CONNECTED) {

        WiFi.reconnect();

        delay(100);

        return;

    }

    if (!mqttClient.connected()) {

        if (millis() - lastMqttAttempt > 5000) {

            lastMqttAttempt = millis();

            connectMQTT();

        }

    }

    else {

        mqttClient.loop();

    }

}
