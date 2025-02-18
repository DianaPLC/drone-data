# drone-data
!["example flight with data display"](copter_flight.gif "demo")
This is a system for gathering and processing data using devices mounted on a quadcopter, then streaming that data in the form of a single, legible display accessible via a browser on a machine on the ground.

> *Note:* the front-end design is closely based on [the Adafruit 3D Model Viewer demo](https://github.com/adafruit/Adafruit_WebSerial_3DModelViewer). Code based on the demo is noted in relevant files.

## Hardware Requirements
The following are mounted on the copter:
- An RPi (ideally 4b or above)
- An Arduino connected to the RPi via Serial-to-USB.
- A GPS connected to the RPi via some method that supports parsing the data with the `gpsd` and `gpsd-clients` pagckages. (Easiest is likely USB.)
- A webcam connected to the RPi via USB.
- A BNO055 IMU connected to the Arduino via I^2^C. (See the [Arduino code README](imu_i2c_rtos/README.md) for details.)

There are a variety of options for powering the components, all with their own tradeoffs. Powering the various electronics off the same battery running the copter's motors is the best option for reducing weight, but may require some soldering and extra converters to step the voltage down to the appropriate levels for the electronic components. It will also reduce flight time slightly, as the RPi in particular can draw a fair amount of power in this configuration. Another easy option is to purchase a reliable battery pack such as those used to charge phones, making sure to get one with output levels matching the RPi's tolerance. This is simpler to setup but will add significant weight to the craft; if using this approach, be careful with weight distribution and be cognizant of how added weight will change the craft's responsiveness. (Also note this will indirectly reduce flight time as well, as more power will be required for lift.)

Personally, I prefer to reduce the number of different power sources on the craft. Mine was powered off a LiPo stack with 12v output, so I split off from that power output and soldered in a 12v-5v step-down buck converter, the output of which powered the RPi. All other components were then powered via their connections to the RPi.

## Software Requirements for the RPi
You should already have Raspbian or some other standard linux distro installed on your RPi; commands below will assume Raspbian. Unless you need the UI for other tasks or prefer it for development, you can run in headless mode. This should be true on any modern distro, but ensure you have Python3 available.

The RPi should also be running:
- A WiFi access point. I recommend using [RaspAP](https://raspap.com/) to set this up.
- A background task that streams video to a dedicated port (port 8081 is used in the code here). I used `motion` with recording disabled and streaming on, but there are several more modern packages available that do the same thing.

To support GPS processing, you will need to have the following packages installed:
- `libgps`
- `gpsd`
- `python3-gps`
- `gpsd-tools`
- `gpsd-clients`

## Setup and Run
First, follow the steps in the [Arduino code README](imu_i2c_rtos/README.md) to wire the IMU and load the code onto your Arduino. Load the [`rpipage`](rpipage/) directory on the RPi. Open a terminal on the RPi, navigate into that directory, and run:
```Bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Ensure everything is wired and connected as expected, and securely mounted on the copter. Depending on the specific ports used by your peripherals and the Arduino model and serial settings you used, you may need to edit the port location and baud rate in line 17 of `drone.py`. Once everything is connected and your webcam feed and GPS daemon are running as indicated, run the following in the `rpipage` directory:
```Bash
flask --app drone run
```

From your machine on the ground, connect to the RPi's access point and open `[yourAPaddress].local:5000` in any standard browser. You'll be able to see a live stream of the data, video feed, and 3D model of roll/pitch/yaw updating based on the copter's movements.