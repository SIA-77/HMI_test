/**
 * pump_ai_module.js
 * 
 * Pump and Analogue Input Module for FUXA
 * 
 * This module:
 * - Loads a configuration for pump operation and sensor input.
 * - Simulates reading an analogue value from a sensor.
 * - Compares the sensor value against setpoints and thresholds.
 * - Emits events for real-time graph updates and alarms.
 * - Logs sensor data and alarm events.
 */

const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

// Utility function for logging (can be extended or replaced by a logging library)
function logMessage(message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
  // Optionally, append logs to a file:
  // fs.appendFileSync('pump_ai.log', `[${timestamp}] ${message}\n`);
}

class PumpAIModule extends EventEmitter {
  /**
   * @param {Object} config - Configuration object for the pump and analogue input.
   */
  constructor(config) {
    super();
    this.config = config;
    this.currentValue = config.analogueInput.setpoint; // Initialize with the setpoint value
    this.logInterval = config.logging?.logInterval || 60; // seconds
    this.lastLogTime = Date.now();
  }

  /**
   * Start the module by initiating sensor readings.
   */
  start() {
    logMessage(`Starting PumpAIModule for pump "${this.config.pump.name}"`);
    // Set up a periodic sensor reading (simulate every second)
    this.readInterval = setInterval(() => this.readSensor(), 1000);
  }

  /**
   * Stop the module.
   */
  stop() {
    clearInterval(this.readInterval);
    logMessage(`Stopping PumpAIModule for pump "${this.config.pump.name}"`);
  }

  /**
   * Simulate sensor reading and process the value.
   */
  readSensor() {
    // Simulate sensor fluctuation: ±5 units around the setpoint.
    const fluctuation = (Math.random() - 0.5) * 10;
    this.currentValue = this.config.analogueInput.setpoint + fluctuation;
    
    // Log the sensor reading if logging is enabled.
    if (this.config.logging?.enable) {
      const now = Date.now();
      if ((now - this.lastLogTime) / 1000 >= this.logInterval) {
        logMessage(`Sensor reading: ${this.currentValue.toFixed(2)} ${this.config.analogueInput.units}`);
        this.lastLogTime = now;
      }
    }
    
    // Emit data event for graph updates.
    this.emit('data', {
      timestamp: new Date(),
      value: this.currentValue,
      units: this.config.analogueInput.units
    });
    
    // Check the sensor value against thresholds.
    this.checkThresholds();
  }

  /**
   * Check the current sensor value against configured thresholds and emit alarms if needed.
   */
  checkThresholds() {
    const value = this.currentValue;
    const { thresholds } = this.config.analogueInput;
    
    if (value >= thresholds.HH) {
      this.triggerAlarm('HH');
    } else if (value >= thresholds.H) {
      this.triggerAlarm('H');
    } else if (value <= thresholds.LL) {
      this.triggerAlarm('LL');
    } else if (value <= thresholds.L) {
      this.triggerAlarm('L');
    } else {
      // Sensor value within safe range; clear any active alarms.
      this.emit('clearAlarm', { value, message: 'Value within safe range.' });
    }
  }

  /**
   * Trigger an alarm based on the threshold level.
   * @param {string} level - Alarm level (e.g., 'HH', 'H', 'L', 'LL').
   */
  triggerAlarm(level) {
    const alarmMsg = `Alarm triggered at level ${level}: Sensor value is ${this.currentValue.toFixed(2)} ${this.config.analogueInput.units}`;
    logMessage(alarmMsg);
    
    // Emit an alarm event with details.
    this.emit('alarm', {
      level,
      value: this.currentValue,
      units: this.config.analogueInput.units,
      timestamp: new Date(),
      action: this.config.alarms?.actions[level] || 'none'
    });
  }
}
