#! /usr/bin/env python

import json
import geojson
import shapely.geometry
import csv
import sys
import optparse

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

def get_geocols(info):
    geocols = {}
    for colname, usage in colnames.iteritems():
        if colname in info:
            geocols[usage] = colname
    return geocols

def to_csv_value(value):
    if isinstance(value, unicode):
        return value.encode("utf-8")
    elif isinstance(value, str):
        return value
    else:
        return json.dumps(value)

def from_csv_value(value):
    value = value.decode("utf-8")
    try:
        return json.loads(value)
    except:
        return value

if len(sys.argv) != 3:
    print """Converts between various data list containers. Supported formats:

json (list containing objects)
geojson (features with properties)
csv (optionally containing json in some columns)

Can for example be used to convert between Pybossa tasks.json format and a geojson
container format allowing you to sort through and filter the tasks visually in
e.g. QGis, and then convert them back for import into Pybossa.

Usages:
    convert.py INFILE OUTFILE

Examples:
    convert.py tasks.json tasks.geojson
    convert.py tasks.geojson tasks.json
    convert.py tasks.geojson tasks.csv
    convert.py tasks.csv tasks.json
"""
    sys.exit(0)

infilename, outfilename = sys.argv[1:]
infiletype = infilename.rsplit(".", 1)[1]
outfiletype = outfilename.rsplit(".", 1)[1]

rows = []
with open(infilename) as f:
    if infiletype == "geojson":
        for feature in geojson.load(f)['features']:
            info = feature['properties']
            for key in info.keys():
                if isinstance(info[key], (str, unicode)):
                    # Quantum GIS mangles GeoJSON properties by
                    # json-dumping them (again, inside the json...) if
                    # they contain json objects...
                    # So work around that by trying to parse the value
                    # as json...
                    try:
                        info[key] = json.loads(info[key])
                    except:
                        pass
            geocols = get_geocols(info)
            # We'll set geo columns to the new geo data, if we can.
            # But to make sure we won't end up with mixed new and old
            # data, we clear them out first...
            for geocol in geocols:
                col = geocols[geocol]
                if col in info:
                    del info[geocols[geocol]]
            geometry = shapely.geometry.asShape(feature['geometry'])
            if 'bbox' in geocols and geometry.type != "Point":
                # Exclude point type to not create infinitely small bboxes, which makes little sense...
                info[geocols['bbox']] = ",".join("%s" % coord for coord in geometry.bounds)
            if 'lat' in geocols and 'lon' in geocols:
                info[geocols['lon']] = geometry.centroid.x
                info[geocols['lat']] = geometry.centroid.y
            if 'geom' in geocols:
                info[geocols['geom']] = feature['geometry']
            rows.append(info)
    elif infiletype == 'json':
        for row in json.load(f):
            rows.append(row)
    elif infiletype == 'csv':
        def stuffvalue(value):
            value = value.decode("utf-8")
            try:
                return json.loads(value)
            except:
                pass
            return value
        def addvalue(row, col, value):            
            for item in col[:-1]:
                if item not in row: row[item] = {}
                row = row[item]
            row[col[-1]] = value
        for row in csv.DictReader(f):
            dstrow = {}
            for key, value in row.iteritems():
                addvalue(dstrow, key.split("__"), from_csv_value(value))
            rows.append(dstrow)

with open(outfilename, "w") as f:
    if outfiletype == "json":
        f.write('[')
        first = True
        for row in rows:
            if not first:
                f.write(",")
            f.write(
                json.dumps(row))
            first = False
        f.write(']\n')
    elif outfiletype == "geojson":
        f.write('{"type": "FeatureCollection", "features": [\n')
        first = True

        for row in rows:
            info = row
            if 'info' in info:
                info = info['info']

            geocols = get_geocols(info)

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
                f.write(",")
            f.write(
                geojson.dumps(
                    geojson.Feature(
                        geometry=geom,
                        properties=row
                        )
                    ) + "\n")
            first = False
        f.write(']}\n')
    elif outfiletype == "csv":
        # Flatten a column tree from json
        cols = set()
        def addcols(row, prefix=()):
            for key, value in row.iteritems():
                if isinstance(value, dict):
                    addcols(value, prefix + (key,))
                else:
                    cols.add('__'.join(prefix + (key,)))
        for row in rows:
            addcols(row)
        cols = list(cols)
        cols.sort()
        def getvalue(row, col):
            for item in col:
                if not isinstance(row, dict) or item not in row:
                    return None
                row = row[item]
            return row
        def flattenvalue(value):
            if isinstance(value, str):
                return value
            elif isinstance(value, unicode):
                return value.encode("utf-8")
            else:
                return json.dumps(value)
        w = csv.writer(f)
        w.writerow(cols)
        for row in rows:
            w.writerow([to_csv_value(getvalue(row, col.split("__"))) for col in cols])
