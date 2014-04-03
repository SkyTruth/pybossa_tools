#!/usr/bin/env python


import os
import sys
import json
from os.path import isfile
from os.path import basename
import ogr
import osr


# Global parameters
DEBUG = False


# Build information
__author__ = 'Kevin Wurster'
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
    print("Usage: [options] task.json task_run.json outfile.shp")
    print("")
    print("Options:")
    print("  --of=driver -> Output driver name/file type - default='ESRI Shapefile'")
    print("  --epsg=int  -> EPSG code for coordinates in task.json - default=4326")
    print("")
    return 1


def pdebug(message):
    """
    Easily handle printing debug information
    """
    global DEBUG
    if DEBUG is True:
        print(message)


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


def get_crowd_selection_counts(input_id, task_runs_json_object):
    """
    Figure out how many times the crowd selected each option
    """
    counts = {'n_frk_res': 0,
              'n_unk_res': 0,
              'n_oth_res': 0,
              'UNKNOWN': 0}
    for task_run in task_runs_json_object:
        if input_id == task_run['task_id']:
            selection = task_run['info']['selection']
            if selection == 'fracking':
                counts['n_frk_res'] += 1
            elif selection == 'unknown':
                counts['n_unk_res'] += 1
            elif selection == 'other':
                counts['n_oth_res'] += 1
            else:
                counts['UNKNOWN'] += 1
    return counts


def main(args):

    """
    Main routine
    """

    # Set defaults and cache containers
    tasks_file = None
    task_runs_file = None
    outfile = None
    outfile_driver = 'ESRI Shapefile'
    outfile_epsg_code = 4326

    # Parse arguments
    arg_error = False
    for arg in args:

        # Outfile specific options
        if '--of=' in arg:
            outfile_driver = arg.split('=', 1)[1]
        elif '--epsg=' in arg:
            outfile_epsg_code = int(arg.split('=', 1)[1])

        # These are positional arguments
        else:
            if tasks_file is None:
                tasks_file = arg
            elif task_runs_file is None:
                task_runs_file = arg
            elif outfile is None:
                outfile = arg

            # Unrecognized options
            else:
                print("ERROR: Invalid argument: %s" % arg)
                arg_error = True

    # == Validate Parameters == #

    # Check make sure files do/don't exist and that all parameters are appropriate
    bail = False
    if arg_error:
        print("ERROR: Did not successfully parse arguments")
        bail = True
    if tasks_file is None or not isfile(tasks_file) or not os.access(tasks_file, os.R_OK):
        print("ERROR: Can't access task file: %s" % str(tasks_file))
        bail = True
    if task_runs_file is None or not isfile(task_runs_file) or not os.access(task_runs_file, os.R_OK):
        print("ERROR: Can't access task run file: %s" % str(task_runs_file))
        bail = True
    if outfile is None:
        print("ERROR: No outfile supplied")
        bail = True
    else:
        if isfile(outfile):
            print("ERROR: Outfile exists: %s" % outfile)
            bail = True
    if not isinstance(outfile_epsg_code, int):
        print("ERROR: EPSG code must be an integer: %s" % str(outfile_epsg_code))
        bail = True
    if bail:
        return 1

    # == Load Data == #

    # Load task.json file into a JSON object
    print("Loading task file...")
    with open(tasks_file, 'r') as f:
        tasks_json = json.load(f)
    print("Found %s items" % str(len(tasks_json)))

    # Load task_run.json file into a JSON object
    print("Loading task run file...")
    with open(task_runs_file, 'r') as f:
        task_runs_json = json.load(f)
    print("Found %s items" % str(len(task_runs_json)))

    # == Create Output File == #

    # Get driver
    print("Creating output file...")
    driver = ogr.GetDriverByName(outfile_driver)
    data_source = driver.CreateDataSource(outfile)

    # Define SRS
    print("Defining SRS...")
    srs = osr.SpatialReference()
    srs.ImportFromEPSG(outfile_epsg_code)

    # Create layer
    print("Creating layer...")
    layer_name = basename(outfile).replace(' ', '_').replace('.shp', '')
    layer = data_source.CreateLayer(layer_name, srs, ogr.wkbPoint)

    # Define fields
    print("Defining fields...")
    string_field = ['location', 'crowd_sel', 'qaqc', 'county', 'wms_url']
    int_fields = ['site_id', 'n_unk_res', 'n_frk_res', 'n_oth_res', 'n_tot_res', 'year']
    real_fields = ['p_crd_a', 'p_s_crd_a']
    for str_f in string_field:
        field_name = ogr.FieldDefn(str_f, ogr.OFTString)
        field_name.SetWidth(254)
        layer.CreateField(field_name)
    for int_f in int_fields:
        field_name = ogr.FieldDefn(int_f, ogr.OFTInteger)
        field_name.SetWidth(10)
        layer.CreateField(field_name)
    for real_f in real_fields:
        field_name = ogr.FieldDefn(real_f, ogr.OFTReal)
        field_name.SetWidth(10)
        layer.CreateField(field_name)

    # == Examine Task.json File == #

    # Loop through all task.json tasks
    len_tasks_json = len(tasks_json)
    i = 0
    for task in tasks_json:

        # Print some debug stuff
        i += 1
        pdebug("Processing task %s of %s" % (str(i), str(len_tasks_json)))

        # Cache some information
        input_task_id = task['id']
        task_location = ''.join([str(task['info']['latitude']), str(task['info']['longitude']),
                                 '---', str(task['info']['year'])])

        # Get initial set of attributes from task body
        task_attributes = {'id': task['id'],
                           'latitude': task['info']['latitude'],
                           'longitude': task['info']['longitude'],
                           'year': task['info']['year'],
                           'wms_url': task['info']['url'],
                           'county': task['info']['county'],
                           'location': task_location}

        # Get the crowd selection counts
        crowd_selection_counts = get_crowd_selection_counts(input_task_id, task_runs_json)
        task_attributes = dict(task_attributes.items() + crowd_selection_counts.items())

        # Figure out what the crowd actually selected and the total number of responses
        n_tot_res = sum(crowd_selection_counts.values())
        task_attributes['n_tot_res'] = n_tot_res
        crowd_selection = get_crowd_selection(crowd_selection_counts)
        task_attributes['crowd_sel'] = crowd_selection

        # Compute crowd agreement
        percent_crowd_agreement = None
        split_percent_crowd_agreement = None
        task_attributes['p_crd_a'] = percent_crowd_agreement
        task_attributes['p_s_crd_a'] = split_percent_crowd_agreement
        if '|' not in crowd_selection:
            percent_crowd_agreement = int(crowd_selection_counts[crowd_selection] * 100 / n_tot_res)
            task_attributes['p_crd_a'] = percent_crowd_agreement
        else:
            for selection in crowd_selection.split('|'):
                selection_percent_crowd_agreement = str(int(crowd_selection_counts[selection] * 100 / n_tot_res))
                if split_percent_crowd_agreement is None:
                    split_percent_crowd_agreement = selection_percent_crowd_agreement
                else:
                    split_percent_crowd_agreement += '|' + selection_percent_crowd_agreement
            task_attributes['p_s_crd_a'] = split_percent_crowd_agreement

        # Update user
        pdebug("  wms_url   = %s" % task_attributes['wms_url'][:40] + ' ...(truncated...)')
        pdebug("  id        = %s" % task_attributes['id'])
        pdebug("  n_unk_res = %s" % str(task_attributes['n_unk_res']))
        pdebug("  n_frk_res = %s" % str(task_attributes['n_frk_res']))
        pdebug("  n_oth_res = %s" % str(task_attributes['n_oth_res']))
        pdebug("  n_tot_res = %s" % str(task_attributes['n_tot_res']))
        pdebug("  crowd_sel = %s" % task_attributes['crowd_sel'])
        pdebug("  p_crd_a   = %s" % str(task_attributes['p_crd_a']))
        pdebug("  p_s_crd_a = %s" % str(task_attributes['p_s_crd_a']))
        pdebug("  latitude  = %s" % str(task_attributes['latitude']))
        pdebug("  longitude = %s" % str(task_attributes['longitude']))
        pdebug("  county    = %s" % task_attributes['county'])
        pdebug("  year      = %s" % str(task_attributes['year']))
        pdebug("  ")

        # Create the feature
        feature = ogr.Feature(layer.GetLayerDefn())
        feature.SetField('wms_url', task_attributes['wms_url'])
        feature.SetField('id', task_attributes['id'])
        feature.SetField('n_unk_res', task_attributes['n_unk_res'])
        feature.SetField('n_frk_res', task_attributes['n_frk_res'])
        feature.SetField('n_oth_res', task_attributes['n_oth_res'])
        feature.SetField('n_tot_res', task_attributes['n_tot_res'])
        feature.SetField('crowd_sel', task_attributes['crowd_sel'])
        feature.SetField('p_crd_a', task_attributes['p_crd_a'])
        feature.SetField('p_s_crd_a', task_attributes['p_s_crd_a'])
        feature.SetField('county', task_attributes['county'])
        feature.SetField('year', task_attributes['year'])
        wkt = "POINT(%f %f)" % (float(task_attributes['longitude']), float(task_attributes['latitude']))
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
    if len(sys.argv) is 1:
        sys.exit(print_usage())
    else:
        sys.exit(main(sys.argv[1:]))
