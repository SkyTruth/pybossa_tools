#! /usr/bin/env python

import json
import geojson
import sys

colnames = {
    'bbox': 'bbox',
    'the_geom': 'geom',
    'geom': 'geom',
    'gemoetry': 'geom',
    'lat': 'lat',
    'latitude': 'lat',
    'lon': 'lon',
    'lng': 'lon',
    'longitude': 'lon'
    }

if len(sys.argv) != 2:
    print """Converts between Pybossa tasks.json format and a geojson container
format allowing you to sort through and filter the tasks visually in
e.g. QGis, and then convert them back for import into Pybossa.

Usages:
    convert.py tasks.json
    convert.py tasks.geojson
"""
    sys.exit(0)

infilename = sys.argv[1]

if infilename.endswith(".geojson"):
    sys.stdout.write('[')
    with open(infilename) as f:
        first = True
        for feature in geojson.load(f)['features']:
            if not first:
                sys.stdout.write(",")
            sys.stdout.write(
                json.dumps(feature['properties']))
            first = False
    sys.stdout.write(']\n')


elif infilename.endswith(".json"):
    sys.stdout.write('{"type": "FeatureCollection", "features": [\n')
    with open(infilename) as f:
        first = True
        
        for task in json.load(f):
            info = task
            if 'info' in info:
                info = info['info']

            geocols = {}
            for colname, usage in colnames.iteritems():
                if colname in info:
                    geocols[usage] = colname

            if 'bbox' in geocols:
                left, top, right, bottom = [float(coord) for coord in info[geocols['bbox']].split(",")]
                geom = geojson.Polygon(
                    coordinates=[[[left, top], [right, top], [right, bottom], [left, bottom], [left, top]]])
            elif 'lat' in geocols and 'lon' in geocols:
                geom = geojson.Point(
                    coordinates=[info[geocols['lon']], info[geocols['lat']]])
            elif 'geom' in geocols:
                geom = geojson.loads(info[geocols['geom']])

            if not first:
                sys.stdout.write(",")
            sys.stdout.write(
                geojson.dumps(
                    geojson.Feature(
                        geometry=geom,
                        properties=task
                        )
                    ) + "\n")
            first = False
        sys.stdout.write(']}\n')
