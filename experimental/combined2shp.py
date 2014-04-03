#!/usr/bin/env python


from __future__ import division
import ogr
import osr
import sys
import json
from os.path import isfile
from os.path import basename


__author__ ='Kevin Wurster'
__organization__ = 'SkyTruth'
__doc__ = """
Convert a FrackFinder JSON export to a shapefile
containing 1 point per pond and aggregated response
metrics.
"""


def print_usage():
    """
    Command line usage information
    """
    print("")
    print("Usage: combined.json outfile.shp")
    print("")
    return 1


def get_unique_pond_ids(json_object, id_field='task_id'):
    """
    Get a list of unique pond ID's
    """
    return set([i[id_field] for i in json_object])


def get_crowd_selection(selection_count):
    """
    Figure out what the crowd actually selected
    """

    # Cache containers
    crowd_selection = 'NONE'

    # Figure out what the maximum number of selections was
    max_selection = max(selection_count.values())

    # Build the crowd_selection
    for selection, count in selection_count.iteritems():
        if crowd_selection == 'NONE':
            crowd_selection = selection
        else:
            crowd_selection += '|' + selection

    # Return to user
    return crowd_selection


def get_task_attributes(input_id, json_object):
    """
    Collect attributes for a given task/pond ID
    """

    # Container for caching all attributes
    attributes = {}

    # Loop through all the input combined tasks in the json_object
    for item in json_object:

        # If the input id matches the foreign key in a combined task, pull some attributes
        if str(item['task_id']) == str(input_id):

            # Get attributes
            attributes['wms_url'] = item['task']['info']['url']
            attributes['latitude'] = item['task']['info']['latitude']
            attributes['longitude'] = item['task']['info']['longitude']
            attributes['year'] = item['task']['info']['year']
            attributes['county'] = item['task']['info']['county']

            # Tally categorizations
            # Try/except is for a weird situation where item['info']['selection'] raises a KeyError exception
            # No idea why this happens
            attributes['n_unk_res'] = 0
            attributes['n_frk_res'] = 0
            attributes['n_oth_res'] = 0
            try:
                categorization = item['info']['selection']
                if categorization == 'unknown':
                    attributes['n_unk_res'] += 1
                elif categorization == 'fracking':
                    attributes['n_frk_res'] += 1
                elif categorization == 'other':
                    attributes['n_oth_res'] += 1
            except KeyError:
                attributes['n_unk_res'] = 0
                attributes['n_frk_res'] = 0
                attributes['n_oth_res'] = 0

            # Compute the total number of responses
            attributes['n_tot_res'] = attributes['n_unk_res'] + attributes['n_frk_res'] + attributes['n_oth_res']

            # Handle some 'NoneType' weirdness - no idea why this happens
            if attributes['wms_url'] is None:
                attributes['wms_url'] = 'NONE'

        # Figure out what the crowd selected
        response_map = {'fracking': attributes['n_frk_res'],
                        'other': attributes['n_oth_res'],
                        'unknown': attributes['n_unk_res']}
        attributes['crowd_sel'] = get_crowd_selection(response_map)

    # Return final set of attributes
    return attributes


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
        unique_pond_ids = get_unique_pond_ids(loaded_json)
        total_unique_pond_ids = len(unique_pond_ids)  # This is used later to prevent calculating len for every task
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
        field_name = ogr.FieldDefn('crowd_sel', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('crowd_agr', ogr.OFTReal)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('qaqc', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('county', ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
        field_name = ogr.FieldDefn('year', ogr.OFTInteger)
        field_name.SetWidth(10)
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

            # Get the pond/site attributes
            site_attributes = get_task_attributes(pond_id, loaded_json)

            # Update user
            print("  wms_url   = %s" % site_attributes['wms_url'][:40] + ' ...(truncated...)')
            print("  pond_id   = %s" % site_attributes['pond_id'])
            print("  n_unk_res = %s" % str(site_attributes['n_unk_res']))
            print("  n_frk_res = %s" % str(site_attributes['n_frk_res']))
            print("  n_oth_res = %s" % str(site_attributes['n_oth_res']))
            print("  n_tot_res = %s" % str(site_attributes['n_tot_res']))
            print("  latitude  = %s" % str(site_attributes['latitude']))
            print("  longitude = %s" % str(site_attributes['longitude']))
            print("  county    = %s" % site_attributes['county'])
            print("  year      = %s" % str(site_attributes['year']))
            print("  ")

            # Create the feature
            feature = ogr.Feature(layer.GetLayerDefn())
            feature.SetField('pond_id', pond_id)
            feature.SetField('n_unk_res', site_attributes['n_unk_res'])
            feature.SetField('n_frk_res', site_attributes['n_frk_res'])
            feature.SetField('n_oth_res', site_attributes['n_oth_res'])
            feature.SetField('n_tot_res', site_attributes['n_tot_res'])
            feature.SetField('county', site_attributes['county'])
            feature.SetField('year', site_attributes['year'])
            feature.SetField('wms_url', site_attributes['wms_url'])
            wkt = "POINT(%f %f)" % (float(site_attributes['longitude']), float(site_attributes['latitude']))
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
