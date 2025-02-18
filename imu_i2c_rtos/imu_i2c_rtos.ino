// Easier I/O wire handling
#include <Wire.h>

// Adafruit sensor libraries
#include <Adafruit_Sensor.h>
#include <Adafruit_BNO055.h>

// Arduino FreeRTOS library
#include <Arduino_FreeRTOS.h>
// FreeRTOS queue support
#include <queue.h>

// Structure for holding R/P/Y data
struct imuData {
  float roll;
  float pitch;
  float yaw;
};

// FreeRTOS queue for imuData objects
QueueHandle_t dataQueue;

// Adafruit BNO055 handler for IMU
// Adjust wire address for non-MEGA boards
Adafruit_BNO055 currentIMU = Adafruit_BNO055(55, 0x28, &Wire);

void setup(void)
{
  // Initialize and wait for serial to be ready
  Serial.begin(9600);
  while (!Serial);

  // Start IMU
  if(!currentIMU.begin())
  {
    Serial.println("Unable to deted BNO055 IMU.");
    while(1);
  }

  // Use Arduino's clock
  currentIMU.setExtCrystalUse(true);

  // Establish queue to hold IMU readings
  dataQueue = xQueueCreate(10, sizeof(struct imuData));
  // Establish tasks
  if (dataQueue != NULL) {
    // Task to transmit IMU data via Serial connection (low priority)
    xTaskCreate(TaskSendIMU, "SerialOut", 128, NULL, 1, NULL);
    // Task to read IMU data via I2c (high priority)
    xTaskCreate(TaskReadIMU, "ReadIMU", 128, NULL, 2, NULL);
  }
}

void loop(void) { }

void TaskReadIMU(void *pvParameters) {
  (void) pvParameters;
  for (;;) {
    sensors_event_t event;
    currentIMU.getEvent(&event);
    struct imuData currentimuData;
    currentimuData.yaw = event.orientation.x;
    currentimuData.pitch = event.orientation.y;
    currentimuData.roll = event.orientation.z;
    xQueueSend(dataQueue, &currentimuData, ( TickType_t ) 10);
    vTaskDelay(5);
  }
}

void TaskSendIMU(void *pvParameters) {
  (void) pvParameters;
  for (;;) {
    struct imuData currentimuData;
    if (xQueueReceive(dataQueue, &currentimuData, portMAX_DELAY) == pdPASS) {
      Serial.print("{\"Roll\": "); Serial.print(currentimuData.roll);
      Serial.print(", \"Pitch\": "); Serial.print(currentimuData.pitch);
      Serial.print(", \"Yaw\": "); Serial.print(currentimuData.yaw); Serial.println("}");
    }
  }
}