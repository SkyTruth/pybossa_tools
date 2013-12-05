#! /bin/env python

import sys
import json
import geojson
import shapely

# Task layout
# {"info": {
#         "n_answers": 30,
#         "url": "https://mapsengine.google.com/06136759344167181854-15360160187865123339-4/wms/",
#         "question": "Please click on any fracking pond(s) you see in this map",
#         "longitude": -77.082574,
#         "county": "Tioga",
#         "state": "PA",
#         "SiteID": "c94b8c55-da69-5cc4-b40f-67396f49974b",
#         "bbox": "-77.0897987266,41.8422220145,-77.0753492734,41.8530259804",
#         "year": "2010",
#         "latitude": 41.847624,
#         "options": {
#             "layers": "06136759344167181854-16779344390631852423-4",
#             "version": "1.3.0"}},
#  "n_answers": 30,
#  "quorum": 0,
#  "calibration": 0,
#  "created": "2013-11-04T17:32:36.187495",
#  "app_id": 15,
#  "state": "completed",
#  "id": 3294,
#  "priority_0": 0.0}

# Task run layout
# {"info": {
#         "positions": [{"lat": 41.935984746031, "lon": -77.025829871467}]},
#  "user_id": 10,
#  "task_id": 3217,
#  "created": "2013-11-04T19:14:07.984752",
#  "finish_time": "2013-11-04T19:14:07.984773",
#  "calibration": null,
#  "app_id": 15,
#  "user_ip": null,
#  "timeout": null,
#  "id": 4034}

with open(sys.argv[1]) as f:
    tasks = json.loads(f.read())

task_idx_by_id = {}
for idx, task in enumerate(tasks):
    task_idx_by_id[task['id']] = idx

with open(sys.argv[2]) as f:
    taskruns = json.loads(f.read())

for task in tasks:
    task.update(task.pop('info'))

for taskrun in taskruns:
    taskrun['taskrun_id'] = taskrun.pop('id')


print '{"type": "FeatureCollection", "features": ['

nrofpoints = 0
first = True
for taskrun in taskruns:
    task = tasks[task_idx_by_id[taskrun['task_id']]]

    info = {}
    info.update(task)
    taskrundata = dict(taskrun)
    taskrundata.pop('info')
    info.update(taskrundata)

    if 'latitude' in info: info['old_latitude'] = info.pop('latitude')
    if 'longitude' in info: info['old_longitude'] = info.pop('longitude')

    for pos in taskrun['info']['positions']:
        if not first:
            print ","
        
        info['latitude'] = pos['lat']
        info['longitude'] = pos['lon']
        print geojson.dumps(
            geojson.Feature(
                geometry=geojson.Point(
                    coordinates=[pos['lon'], pos['lat']]),
                properties=info
                )
            )
        nrofpoints += 1

        first = False

print ']}'

sys.stderr.write("Nr of points: %s\n" % nrofpoints)
