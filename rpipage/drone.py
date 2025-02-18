import mimetypes
mimetypes.add_type('application/javascript', '.mjs')
mimetypes.add_type('text/css', '.css')

import serial
import json
import gps
from time import sleep

from flask import Flask, Response, render_template


app = Flask(__name__)

def read_serial():
    # Adjust USB port location and baud rate as needed for your setp
    ser = serial.Serial('/dev/ttyACM1', 9600)
    if not ser.is_open:
      try:
          ser.open()
      except serial.SerialException as e:
          yield f'Serial port error({e.errno}): {e.strerror}\n'
    sleep(0.1)
    while True:
        line = ser.readline()
        yield line

def read_gps():
    session = gps.gps(mode=gps.WATCH_ENABLE)
    modes = ["Invalid Fix", "No Fix", "2D Fix", "3D Fix"]
    while 0 == session.read():
        if not (gps.MODE_SET & session.valid):
            continue
        lat = session.fix.latitude
        lon = session.fix.longitude
        alt = session.fix.altitude
        climb = session.fix.climb
        status = modes[session.fix.mode]
        speed = session.fix.speed
        data = {
            'lat': lat if gps.isfinite(lat) else 'n/a',
            'lon': lon if gps.isfinite(lon) else 'n/a',
            'alt': alt if gps.isfinite(alt) else 'n/a',
            'speed': speed if gps.isfinite(speed) else 'n/a',
            'climb': climb if gps.isfinite(climb) else 'n/a',
            'status': status
        }
        val = json.dumps(data)
        yield val
        sleep(0.1)

@app.route("/")
def drone_data():
    return render_template('/index.html')

@app.route("/script_js")
def script_js():
    response = Response(response=render_template('/js/script.mjs'), status=200, mimetype="application/javascript")
    return response

@app.route("/serial_stream")
def serial_stream():
    return Response(read_serial(), mimetype='text/event-stream')

@app.route("/gps_stream")
def gps_stream():
    return Response(read_gps(), mimetype='text/event-stream')