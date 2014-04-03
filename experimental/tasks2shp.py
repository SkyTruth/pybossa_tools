#!/usr/bin/env python


__author__ ='Kevin Wurster'
__organization__ = 'SkyTruth'
__doc__ = """
Convert a FracFinder JSON export to a shapefile
containing 1 point per pond and aggregated response
metrics.
"""


import ogr
import osr
import sys
import json
from os.path import isfile
from os.path import basename


def print_usage():
    print("Usage: infile.json outfile.shp")
    return 1


def main(args):

    # Define infile/outfile and validate
    infile = args[0]
    outfile = args[1]
    if not isfile(infile):
        print("ERROR: Can't find input file: %s" % infile)
        return 1
    if isfile(outfile):
        print("ERROR: Output file exists: %s" % outfile)
        return 1

    # Load JSON object, parse, transform, and write to output shapefile
    print("Loading JSON...")
    with open(infile) as json_data:

        loaded_json = json.load(json_data)

        # Get list of unique pond ID's
        print("Getting list of unique pond ID's...")
        unique_pond_ids = []
        for entry in loaded_json:
            upi = entry['task_id']
            if upi not in unique_pond_ids:
                unique_pond_ids.append(upi)
        total_unique_pond_ids = len(unique_pond_ids)
        print("Found %s unique pond ID's" % str(total_unique_pond_ids))

        # == Create output shapefile == #

        # Define driver
        print("Creating output file...")
        driver = ogr.GetDriverByName('ESRI Shapefile')
        data_source = driver.CreateDataSource(outfile)

        # Define SRS
        print("Defining SRS...")
        srs = osr.SpatialReference()
        srs.ImportFromEPSG(4326)
        # Create layer
        print("Creating layer...")
        layer_name = basename(outfile).replace(' ', '_').replace('.shp', '')
        layer = data_source.CreateLayer(layer_name, srs, ogr.wkbPoint)
        # Define fields
        print("Defining fields...")
        field_name = ogr.FieldDefn('pond_id', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('n_unk_res', ogr.OFTInteger)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('n_frk_res', ogr.OFTInteger)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('n_oth_res', ogr.OFTInteger)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('n_tot_res', ogr.OFTInteger)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('qaqc', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('county', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('year', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('wms_url', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)

        # Loop through unique ponds, parse json, and write to shapefile
        i = 0
        for pond_id in unique_pond_ids:

            # Update user
            i += 1
            print("Processing %s of %s" % (i, str(total_unique_pond_ids)))

            # Reset field values
            n_unk_res = 0
            n_frk_res = 0
            n_oth_res = 0
            n_tot_res = 0
            county = None
            year = None
            wms_url = None
            latitude = None
            longitude = None
            categorization = None

            # Get all responses associated with a given pond ID
            for item in loaded_json:

                if item['task_id'] == pond_id:

                    # Get attributes
                    wms_url = item['task']['info']['url']
                    latitude = item['task']['info']['latitude']
                    longitude = item['task']['info']['longitude']
                    year = item['task']['info']['year']
                    county = item['task']['info']['county']

                    # Tally categorizations
                    # Try/except is for a weird situation where item['info']['selection'] raises a KeyError exception
                    # No idea why this happens
                    try:
                        categorization = item['info']['selection']
                        if categorization == 'unknown':
                            n_unk_res += 1
                        elif categorization == 'fracking':
                            n_frk_res += 1
                        elif categorization == 'other':
                            n_oth_res += 1
                        else:
                            print("ERROR: Invalid categorization")
                            print("       pond id = %s" % pond_id)
                            print("       class   = %s" % categorization)
                    except KeyError:
                        n_unk_res = 0
                        n_frk_res = 0
                        n_oth_res = 0


            # Compute the total number of responses
            n_tot_res = n_unk_res + n_frk_res + n_oth_res

            # Handle some 'NoneType' weirdness - no idea why this happens
            if wms_url is None:
                wms_url = "None"

            # Update user
            print("  wms_url   = %s" % wms_url[:40] + ' ...(truncated...)')
            print("  pond_id   = %s" % pond_id)
            print("  n_unk_res = %s" % str(n_unk_res))
            print("  n_frk_res = %s" % str(n_frk_res))
            print("  n_oth_res = %s" % str(n_oth_res))
            print("  n_tot_res = %s" % n_tot_res)
            print("  latitude  = %s" % str(latitude))
            print("  longitude = %s" % str(longitude))
            print("  county    = %s" % county)
            print("  year      = %s" % year)
            print("  ")

            # Create the feature
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetField('pond_id', str(pond_id))
            feature.SetField('n_unk_res', int(n_unk_res))
            feature.SetField('n_frk_res', int(n_frk_res))
            feature.SetField('n_oth_res', int(n_oth_res))
            feature.SetField('n_tot_res', int(n_tot_res))
            feature.SetField('county', str(county))
            feature.SetField('year', str(year))
            feature.SetField('wms_url', str(wms_url))
            wkt = "POINT(%f %f)" % (float(longitude), float(latitude))
            point = ogr.CreateGeometryFromWkt(wkt)
            feature.SetGeometry(point)
            layer.CreateFeature(feature)

            # Cleanup
            feature.Destroy()

        # Cleanup shapefile
        data_source.Destroy()

    # Update user
    print("Done.")

    # Everything executed properly
    return 0

if __name__ == '__main__':
    if len(sys.argv) is not 3:
        sys.exit(print_usage())
    else:
        sys.exit(main(sys.argv[1:]))
