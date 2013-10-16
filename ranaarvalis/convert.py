import sys
import csv
import shapely.wkt
import shapely.geometry
import shapely.affinity
import json
import pyproj
import fastkml

csv.field_size_limit(sys.maxsize)


def generate():
    width = 1600
    height = 8000
    overlap = 100

    geod = pyproj.Geod(ellps="WGS84")

    with open(sys.argv[1]) as f:
        for row in csv.DictReader(f):
            if row['name'] != "Tioga County, PA": continue
            row['geom'] = shapely.wkt.loads(row['geom'])

            (minx, miny, maxx, maxy) = row['geom'].bounds

            def generate():

                y = miny
                while y < maxy:
                    x = minx
                    dummy, nexty, dummy = geod.fwd(x, y, 0, height)
                    dummy, nextoy, dummy = geod.fwd(x, nexty, 0, overlap)
                    while x < maxx:
                        nextx, dummy, dummy = geod.fwd(x, y, 90, width)
                        nextox, dummy, dummy = geod.fwd(nextx, y, 90, overlap)
                        
                        area = shapely.geometry.Polygon([(x, y), (nextox, y), (nextox, nextoy), (x, nextoy), (x, y)])
                        if area.intersects(row['geom']):
                            # area = area.intersection(row['geom'])

                            yield area, (min(x, nextox), min(y, nextoy), max(x, nextox), max(y, nextoy))

                        x = nextx
                    y = nexty

            yield row, row['geom'], shapely.geometry.Polygon([(minx, miny), (maxx, miny), (maxx, maxy), (minx, maxy), (minx, miny)]), generate()


if sys.argv[2] == 'kml':
    k = fastkml.kml.KML()
    ns = '{http://www.opengis.net/kml/2.2}'
    d = fastkml.kml.Document(ns, 'docid', 'doc name', 'doc description')
    k.append(d)

    counties = fastkml.kml.Folder(ns, 'nested-fid', 'County outlines', 'nested f description')
    d.append(counties)
    tasks = fastkml.kml.Folder(ns, 'nested-fid', 'Tasks', 'nested f description')
    d.append(tasks)

    for row, outline, boundary, areas in generate():
        county = fastkml.kml.Folder(ns, 'nested-fid', row['name'], 'nested f description')
        tasks.append(county)

        p = fastkml.kml.Placemark(ns, 'id', row["name"], 'description')
        p.geometry = outline
        counties.append(p)

        p = fastkml.kml.Placemark(ns, 'id', row["name"] + ' bounds', 'description')
        p.geometry = boundary
        counties.append(p)

        for area, bbox in areas:
            p = fastkml.kml.Placemark(ns, 'id', 'name', 'description')
            p.geometry = area
            county.append(p)

    print k.to_string()
else:
    for row, outline, boundary, areas in generate():
        for area, bbox in areas:
            print json.dumps({
                    "url": "https://mapsengine.google.com/06136759344167181854-15360160187865123339-4/wms/",
                    "options": {"version": "1.3.0", "layers":"06136759344167181854-16779344390631852423-4"},
                    "bbox": "%s,%s,%s,%s" % bbox
                    })

