#! /bin/env python

import geojson
import sys
import shapely.geometry
import json

with open(sys.argv[1]) as f:
    data = f.read()
data = geojson.loads(data)

for feature in data['features']:
    geom = shapely.geometry.shape(feature['geometry'])
    task = feature['properties']
    task['bbox'] = "%s,%s,%s,%s" % geom.bounds

    task.update({"url": "https://mapsengine.google.com/06136759344167181854-15360160187865123339-4/wms/",
                 "options": {"layers": "06136759344167181854-16779344390631852423-4", "version": "1.3.0"}})

    print json.dumps(task)



