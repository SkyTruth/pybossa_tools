#!/usr/bin/env python


import os
import sys
import json
from os.path import isfile
from os.path import dirname


# Build information
__author__ = 'Kevin Wurster'
__version__ = '0.1'
__copyright__ = 'SkyTruth 2014'
__license__ = 'See LICENSE.txt'
__website__ = 'SkyTruth.org'
__email__ = 'labs@skytruth.org'
__doc__ = '''
Utility for extracting incomplete tasks from PyBOSSA
'''

# Global parameters
VERBOSE = True
DEBUG = False


def vprint(message):

    """
    Function for handling global verbosity.

    Turn on/off print all print statements by changing
    the global variable VERBOSE.
    """

    global VERBOSE
    if VERBOSE:
        print(message)


def debug(message):

    """
    Function for handling debug statements.

    Turn on/off print all debug statements by changing
    the global variable DEBUG.
    """

    global DEBUG
    if DEBUG:
        print(message)


def print_help():

    """
    Print general script help information.
    """

    print("Help")
    return 1


def print_usage():

    """
    Print script usage.
    """

    print("")
    print("Usage: tasks.json task_runs.json outfile.json [options]")
    print("")
    print("Options:")
    print("  --")
    return 1


def print_helpinfo():

    """
    Print a list of flags that can print helpful information.
    """

    print("Help info")
    return 1


def print_version():

    """
    Print version, copyright, author, and contact information.
    """

    print("")
    print("getUnfinishedTasks.py version %s" % str(__version__))
    print("Author: %s" % __author__)
    print("Copyright %s" % __copyright__)
    print(__email__)
    print(__website__)
    print("")
    return 1


def print_license():
    """
    Print license information.
    """
    print(__license__)
    return 1


def is_task_in_set(task_id, tasks_json_object, return_true='object'):
    """
    Checks whether or not a task ID is in a set of tasks

    task_id: Unique task ID as an integer
    tasks_json_object: Loaded JSON object
    return_true: What to return if the task ID is found - defaults to returning the task object
    """
    for task in tasks_json_object:
        if task_id is task['id']:
            if return_true == 'object':
                return task
            else:
                return return_true
    else:
        return False


def main(args):

    """
    Main routine.
    """

    # == Cache defaults and containers == #

    # Input/output files
    infile = None
    outfile = None

    # Cache filtering defaults
    num_min_responses = 0
    num_max_responses = 10000
    exclude_file = None
    excl_num_min_responses = 0
    excl_num_max_responses = 10000

    # Cache processing defaults
    null_task_id = False

    # == Argument Parser == #

    # Loop through all arguments and configure
    debug("DEBUG: Parsing arguments...")
    i = 0
    arg_error = False
    while i < len(args):

        # Get argument
        try:
            arg = args[i]
            debug("DEBUG: arg='%s'" % arg)
        except ValueError:
            vprint("ERROR: An argument has invalid parameters")
            arg_error = True

        # Help arguments
        if arg in ('--help', '-help'):
            return print_help()
        elif arg in ('--usage', '-usage'):
            return print_usage()
        elif arg in ('--help-info', '-help-info', '--helpinfo', '-helpinfo'):
            return print_helpinfo()
        elif arg in ('--version', '-version'):
            return print_version()
        elif arg in ('--license', '-license'):
            return print_license()

        # Filtering parameters
        elif '--min-responses=' in arg:
            i += 1
            try:
                num_min_responses = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--min-responses=int' must be an integer")
                arg_error = True
        elif '--max-responses=' in arg:
            i += 1
            try:
                num_max_responses = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--max-responses=int' must be an integer")
                arg_error = True
        elif '--excl-min-responses=' in arg:
            i += 1
            try:
                excl_num_min_responses = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--excl-min-responses=int must be an integer")
                arg_error = True
        elif '--excl-max-responses=' in arg:
            i += 1
            try:
                excl_num_max_responses = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--excl-max-responses=int must be an integer")
                arg_error = True
        elif arg in ('--exclude', '-e'):
            i += 2
            exclude_file = args[i - 1]

        # Processing options
        elif arg in ('--null-task-id', '-null-task-id', '-nti'):
            i += 1
            null_task_id = True

        # Ignore completely empty arguments
        elif arg == '':
            pass

        # Assume some things about the argument
        else:
            # If the infile file has not been defined, assume argument is the infile
            if infile is None:
                infile = arg
            # If the infile has been defined, assume argument is the outfile
            elif outfile is None:
                outfile = arg
            # If both infile and outfile have been defined, argument was not recognized by parser
            # and is assumed to be invalid
            else:
                vprint("ERROR: Invalid argument: %s" % arg)
                arg_error = True

    # Check to see if any argument errors were encountered, if so, bail
    if arg_error:
        vprint("ERROR: Encountered a problem parsing arguments")
        return 1

    # Validate requirements before proceeding
    debug("DEBUG: Validating requirements before proceeding...")
    bail = False
    # Check infile
    if infile is not None or not isfile(infile) or not os.access(infile, os.R_OK):
        vprint("ERROR: Need a readable infile: %s" % str(infile))
        bail = True
    # Check exclude file
    if exclude_file is not None:
        if not isfile(exclude_file) or not os.access(exclude_file, os.R_OK):
            vprint("ERROR: Exclude file is not readable or doesn't exist: %s" % str(exclude_file))
            bail = True
    # Check output file/directory
    if outfile is not None and isfile(outfile):
        vprint("ERROR: Output file exists: %s" % outfile)
        bail = True
    if not os.access(dirname(outfile), os.W_OK):
        vprint("ERROR: Can't write to directory: %s" % dirname(outfile))
        bail = True
    # Check infile number of responses filter
    if num_min_responses > num_max_responses or num_min_responses < 0 or num_max_responses < 0:
        vprint("ERROR: Can't filter: --min-responses=%s and --max-responses=%s" %
               (str(num_min_responses), str(num_max_responses)))
        bail = True
    # Check exclude file number of responses filter
    if excl_num_min_responses > excl_num_max_responses or excl_num_min_responses < 0 or excl_num_max_responses < 0:
        vprint("ERROR: Can't filter: --excl-min-responses=%s and --excl-max-responses=%s" %
               (str(excl_num_min_responses), str(excl_num_max_responses)))
        bail = True
    if bail:
        return 1

    # Debug point - pertinent parameters
    debug("")
    debug("+----- DEBUG -----")
    debug("|  infile = '%s'" % infile)
    debug("|  outfile = '%s'" % outfile)
    debug("|  null_task_id = '%s'" % str(null_task_id))
    debug("|  num_min_responses = '%s'" % str(num_min_responses))
    debug("|  num_max_responses = '%s'" % str(num_max_responses))
    debug("|  excl_num_min_responses = '%s'" % str(excl_num_min_responses))
    debug("|  excl_num_max_responses = '%s'" % str(excl_num_max_responses))
    debug("|  Exclusion file = '%s'" % str(exclude_file))
    debug("")

    # == Compare Files == #

    # Container for final JSON object
    incomplete_tasks = {}

    # Cache all exclude

    # Open infile and convert to JSON
    with open(infile, 'r') as open_input_tasks:
        json_infile = json.load(open_input_tasks)
        num_json_input_tasks = len(json_infile)

        # Loop through all tasks in the input file and filter
        for i_task in json_

        # Filter on number of responses
        if num_min_responses <=









        # Open processed tasks file and convert to JSON
        with open(, 'r') as open_processed_Tasks:
            json_processed_tasks = json.load(open_processed_Tasks)
            num_json_processed_tasks = len(json_processed_tasks)

            # Loop through input tasks JSON objects and do some comparisons
            i = 0
            for i_task in json_input_tasks:

                # Cache some values
                i_task_id = i_task['id']
                i

                # Check to see if the input task ID

                # Update user
                vprint("Processing task %s of %s" % (str(i), str(num_json_input_tasks)))

                # Cache the input task id
                task_id = task['id']

                # Loop through the processed tasks to see if the input task has been processed
                for p_task in json_processed_tasks:

                    # Cache the process task
                    p_task_id = p_task['id']
                    p_task_runs_nr = p_task['task_runs_nr']
                    if task_id is p_task_id:
                        if num_min_responses <= p_task_runs_nr <= num_max_responses:
                            if null_task_id:
                                p_task['id'] = None
                            incomplete_tasks.append(p_task)
                    else:
                        incomplete_tasks.append(p_task)






    # == Write File == #


    # == Cleanup == #












'''
{u'app_id': 37,
 u'calibration': 0,
 u'created': u'2014-03-18T10:01:09.876911',
 u'id': 81953,
 u'info': {u'SiteID': u'8d1fd06d-c3ef-5315-9da6-b8ccfd0b3f82',
  u'app_id': 18,
  u'calibratio': None,
  u'county': u'Butler',
  u'created': u'2013-12-03T03:55:56.391466',
  u'finish_tim': u'2013-12-03T03:55:56.391490',
  u'id': 0,
  u'latitude': 41.113308451114094,
  u'longitude': -79.73987267325234,
  u'n_answers': 0,
  u'old_latitu': 41.113621,
  u'old_longit': -79.740299,
  u'options': {u'layers': u'06136759344167181854-09877175765652212076-4',
   u'version': u'1.3.0'},
  u'priority_0': 0.0,
  u'quorum': 0,
  u'state': u'PA',
  u'task_id': 16914,
  u'taskrun_id': 23539,
  u'timeout': None,
  u'url': u'https://mapsengine.google.com/06136759344167181854-00219351362547715467-4/wms/?version=1.3.0',
  u'user_id': 74,
  u'user_ip': None,
  u'year': 2008},
 u'n_answers': 3,
 u'priority_0': 0.0,
 u'quorum': 0,
 u'state': u'completed',
 u'task_runs_nr': 3}
'''



    return 0


if __name__ == '__main__':
    if len(sys.argv) is 1:
        sys.exit(print_usage())
    else:
        sys.exit(main(sys.argv[1:])