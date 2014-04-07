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


def get_crowd_selection(selection_count, selection_map):
    """
    Figure out what the crowd actually selected
    """

    # Cache containers
    crowd_selection = 'NONE'

    # Figure out what the maximum number of selections was
    max_selection = max(selection_count.values())

    # Build the crowd_selection
    for selection, count in selection_count.iteritems():
        if count is max_selection:
            if crowd_selection == 'NONE':
                crowd_selection = selection_map[selection]
            else:
                crowd_selection += '|' + selection_map[selection]

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


def get_percent_crowd_agreement(crowd_selection, selection_counts, total_responses, map_selection_field,
                                pca_val_when_split=-1):
    """
    Figure out how well the crowd agreed

    If two answers tied, figure out the agreement for both
    """

    # Compute crowd agreement
    per_crowd_agreement = None
    split_per_crowd_agreement = None
    if '|' not in crowd_selection:
        per_crowd_agreement = int(selection_counts[map_selection_field[crowd_selection]] * 100 / total_responses)
    else:

        # Compute percent agreement for each split response
        for selection in crowd_selection.split('|'):
            field_name = map_selection_field[selection]
            selection_count = selection_counts[field_name]
            per_crowd_agreement = int(selection_count * 100 / total_responses)
            if split_per_crowd_agreement is None:
                split_per_crowd_agreement = str(per_crowd_agreement)
            else:
                split_per_crowd_agreement += '|' + str(per_crowd_agreement)

        # Make sure the percent crowd agreement field is None when there is a split response
        per_crowd_agreement = pca_val_when_split

    return {'p_crd_a': per_crowd_agreement, 'p_s_crd_a': split_per_crowd_agreement}


def main(args):

    """
    Main routine
    """

    global DEBUG

    # Set defaults and cache containers
    tasks_file = None
    task_runs_file = None
    outfile = None
    outfile_driver = 'ESRI Shapefile'
    outfile_epsg_code = 4326

    # Map field names to selections
    map_field_to_selection = {'n_frk_res': 'fracking',
                              'n_oth_res': 'other',
                              'n_unk_res': 'unknown',
                              'UNKNOWN': 'UNKNOWN'}

    # Map selections to field names
    map_selection_to_field = {'fracking': 'n_frk_res',
                              'other': 'n_oth_res',
                              'unknown': 'n_unk_res',
                              'UNKNOWN': 'UNKNOWN'}

    # Parse arguments
    arg_error = False
    for arg in args:

        # Outfile specific options
        if '--of=' in arg:
            outfile_driver = arg.split('=', 1)[1]
        elif '--epsg=' in arg:
            outfile_epsg_code = int(arg.split('=', 1)[1])

        # Additional options
        elif arg == '--debug':
            DEBUG = True

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
    layer_name = basename(outfile).split('.')
    layer_name = ''.join(layer_name[:len(layer_name) - 1])
    layer = data_source.CreateLayer(layer_name, srs, ogr.wkbPoint)

    # Define fields
    print("Defining fields...")
    fields_definitions = [('id', 10, ogr.OFTInteger),
                          ('site_id', 254, ogr.OFTString),
                          ('wms_url', 254, ogr.OFTString),
                          ('county', 254, ogr.OFTString),
                          ('year', 10, ogr.OFTInteger),
                          ('location', 254, ogr.OFTString),
                          ('n_unk_res', 10, ogr.OFTInteger),
                          ('n_frk_res', 10, ogr.OFTInteger),
                          ('n_oth_res', 10, ogr.OFTInteger),
                          ('n_tot_res', 10, ogr.OFTInteger),
                          ('crowd_sel', 254, ogr.OFTString),
                          ('qaqc', 254, ogr.OFTString),
                          ('p_crd_a', 10, ogr.OFTReal),
                          ('p_s_crd_a', 254, ogr.OFTString)]

    # Create fields
    for field in fields_definitions:
        field_name = field[0]
        field_width = field[1]
        field_type = field[2]
        print("  " + field_name)
        field_object = ogr.FieldDefn(field_name, field_type)
        field_object.SetWidth(field_width)
        layer.CreateField(field_object)

    # == Examine Task.json File == #

    # Loop through all task.json tasks
    len_tasks_json = len(tasks_json)
    i = 0
    print("Analyzing tasks...")
    for task in tasks_json:

        # Print some debug stuff
        i += 1
        pdebug("Processing task %s of %s" % (str(i), str(len_tasks_json)))

        # Cache some information
        input_task_id = task['id']
        task_location = ''.join([str(task['info']['latitude']), str(task['info']['longitude']),
                                 '---', str(task['info']['year'])])

        # Get initial set of attributes from task body
        task_attributes = {'id': str(task['id']),
                           'latitude': str(task['info']['latitude']),
                           'longitude': str(task['info']['longitude']),
                           'year': int(task['info']['year']),
                           'wms_url': str(task['info']['url']),  # Force to field width
                           'county': str(task['info']['county']),
                           'location': task_location,
                           'site_id': str(task['info']['SiteID'])}

        # Get the crowd selection counts
        crowd_selection_counts = get_crowd_selection_counts(input_task_id, task_runs_json)
        task_attributes = dict(task_attributes.items() + crowd_selection_counts.items())

        # Figure out what the crowd actually selected and the total number of responses
        n_tot_res = int(sum(crowd_selection_counts.values()))
        task_attributes['n_tot_res'] = n_tot_res
        crowd_selection = get_crowd_selection(crowd_selection_counts, map_field_to_selection)
        task_attributes['crowd_sel'] = crowd_selection

        # Get crowd agreement levels
        task_attributes = dict(task_attributes.items()
                               + get_percent_crowd_agreement(task_attributes['crowd_sel'], crowd_selection_counts,
                                                             task_attributes['n_tot_res'],
                                                             map_selection_to_field).items())

        # Update user
        pdebug("  wms_url   = %s" % task_attributes['wms_url'][:40] + ' ...(truncated...)')
        pdebug("  latitude  = %s" % str(task_attributes['latitude']))
        pdebug("  longitude = %s" % str(task_attributes['longitude']))
        pdebug("  id        = %s" % task_attributes['id'])
        pdebug("  site_id   = %s" % task_attributes['site_id'])
        pdebug("  county    = %s" % task_attributes['county'])
        pdebug("  year      = %s" % str(task_attributes['year']))
        pdebug("  location  = %s" % task_attributes['location'])
        pdebug("  n_unk_res = %s" % str(task_attributes['n_unk_res']))
        pdebug("  n_frk_res = %s" % str(task_attributes['n_frk_res']))
        pdebug("  n_oth_res = %s" % str(task_attributes['n_oth_res']))
        pdebug("  n_tot_res = %s" % str(task_attributes['n_tot_res']))
        pdebug("  crowd_sel = %s" % task_attributes['crowd_sel'])
        #pdebug("  qaqc      = %s" % task_attributes['qaqc'])  # Currently a manual process so it has no key to populate
        pdebug("  p_crd_a   = %s" % str(task_attributes['p_crd_a']))
        pdebug("  p_s_crd_a = %s" % str(task_attributes['p_s_crd_a']))
        pdebug("")

        # Create the feature
        feature = ogr.Feature(layer.GetLayerDefn())
        pdebug("Defined feature")
        feature.SetField('id', task_attributes['id'])
        pdebug("Set id")
        feature.SetField('site_id', task_attributes['site_id'])
        pdebug("Set site_id")
        feature.SetField('wms_url', task_attributes['wms_url'])
        pdebug("Set wms_url")
        feature.SetField('county', task_attributes['county'])
        pdebug("Set county")
        feature.SetField('year', task_attributes['year'])
        pdebug("Set year")
        feature.SetField('location', task_attributes['location'])
        pdebug("Set location")
        feature.SetField('n_unk_res', task_attributes['n_unk_res'])
        pdebug("Set n_unk_res")
        feature.SetField('n_frk_res', task_attributes['n_frk_res'])
        pdebug("Set n_frk_res")
        feature.SetField('n_oth_res', task_attributes['n_oth_res'])
        pdebug("Set n_oth_res")
        feature.SetField('n_tot_res', task_attributes['n_tot_res'])
        pdebug("Set n_tot_res")
        feature.SetField('crowd_sel', task_attributes['crowd_sel'])
        pdebug("Set crowd_sel")
        # This is currently a manual process, thus there is no qaqc key in task_attributes
        #feature.SetFID('qaqc', task_attributes['qaqc'])
        #pdebug("Set qaqc")
        feature.SetField('p_crd_a', task_attributes['p_crd_a'])
        pdebug("Set p_crd_a")
        feature.SetField('p_s_crd_a', task_attributes['p_s_crd_a'])
        pdebug("Set p_s_crd_a")
        wkt = "POINT(%f %f)" % (float(task_attributes['longitude']), float(task_attributes['latitude']))
        point = ogr.CreateGeometryFromWkt(wkt)
        pdebug("Created geometry")
        feature.SetGeometry(point)
        pdebug("Set geometry")
        layer.CreateFeature(feature)
        pdebug("Created feature")

        # Cleanup
        feature.Destroy()
        pdebug("Destroyed feature")

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
