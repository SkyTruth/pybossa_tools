#!/usr/bin/env python

from __future__ import division
import os
import sys
import json
from os.path import isfile
from os.path import dirname
from os.path import basename


# Build information
__author__ = 'Kevin Wurster'
__version__ = '0.1'
__copyright__ = 'SkyTruth 2014'
__license__ = 'See LICENSE.txt'
__website__ = 'SkyTruth.org'
__email__ = 'labs@skytruth.org'
__docname__ = basename(__file__)
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
    print("Usage %s: infile.json outfile.json [options]" % __docname__)
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
    print("%s version %s" % (__docname__, str(__version__)))
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


def is_task_in_set(task_id, tasks_json_object, min_id=0, max_id=1000000,):

    """
    Checks whether or not a task ID is in a set of tasks

    task_id: Unique task ID as an integer
    tasks_json_object: Loaded JSON object
    return_true: What to return if the task ID is found - defaults to True - set to 'object' to return the actual task
    """

    # Loop through set to see if the ID exists
    for task in tasks_json_object:

        # Get the task ID to compare to
        compare_id = task['task_id']

        # Filter
        if task_id == compare_id:
            debug("  DEBUG: is_task_in_set: ID match: %s" % task_id)

            # Make sure the found task doesn't violate the task ID filter
            if min_id <= task_id <= max_id:
                debug("  DEBUG: is_task_in_set: Passed ID filter")
                return True

    # Input ID does not exist in the set
    else:
        return False


def main(args):

    """
    Main routine.
    """

    # == Cache defaults and containers == #

    # Explicitly reference global variables
    global VERBOSE
    global DEBUG

    # Input/output files
    infile = None
    outfile = None

    # Cache filtering defaults
    num_min_task_runs = 0
    num_max_task_runs = 1000000
    exclude_file = None
    min_task_id = 0
    max_task_id = 1000000
    excl_min_task_id = 0
    excl_max_task_id = 1000000

    # Cache processing defaults
    null_task_id = False

    # Cache additional options
    write_final_file = True

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

        # Define an exclude file to filter against
        elif arg in ('--exclude', '-e'):
            i += 2
            exclude_file = args[i - 1]

        # Filter infile on task ID
        elif '--min-task-id=' in arg:
            i += 1
            try:
                min_task_id = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--min-task-id=int' must be an integer")
                arg_error = True
        elif '--max-task-id=' in arg:
            i += 1
            try:
                max_task_id = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--max-task-id=int' must be an integer")
                arg_error = True

        # Filter infile on task runs
        elif '--min-runs=' in arg:
            i += 1
            try:
                num_min_task_runs = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--min-runs=int' must be an integer")
                arg_error = True
        elif '--max-runs=' in arg:
            i += 1
            try:
                num_max_task_runs = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--max-runs=int' must be an integer")
                arg_error = True

        # Filter exclude file on task ID
        elif '--excl-min-task-id=' in arg:
            i += 1
            try:
                excl_min_task_id = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--excl-min-task-id=int' must be an integer")
                arg_error = True
        elif '--excl-min-task-id=' in arg:
            i += 1
            try:
                excl_min_task_id = int(arg.split('=')[1])
            except (IndexError, TypeError):
                vprint("ERROR: Arg '--excl-max-task-id=int' must be an integer")
                arg_error = True

        # Processing options
        elif arg in ('--null-task-id', '-null-task-id', '-nti'):
            i += 1
            null_task_id = True

        # Additional parameters
        elif arg in ('--quiet', '-q'):
            i += 1
            VERBOSE = False
        elif arg in ('--debug', '-d'):
            i += 1
            DEBUG = True
        elif arg == '--no-write':
            i += 1
            write_final_file = False

        # Ignore completely empty arguments
        elif arg == '':
            i += 1

        # Assume some things about the argument
        else:
            # If the infile file has not been defined, assume argument is the infile
            if infile is None:
                infile = arg
                i += 1
            # If the infile has been defined, assume argument is the outfile
            elif outfile is None:
                outfile = arg
                i += 1
            # If both infile and outfile have been defined, argument was not recognized by parser
            # and is assumed to be invalid
            else:
                vprint("ERROR: Invalid argument: %s" % arg)
                arg_error = True
                i += 1

    # Check to see if any argument errors were encountered, if so, bail
    if arg_error:
        vprint("ERROR: Encountered a problem parsing arguments")
        return 1

    # == Validate requirements before proceeding == #
    debug("DEBUG: Validating requirements before proceeding...")
    bail = False

    # Check infile
    if infile is None or not isfile(infile) or not os.access(infile, os.R_OK):
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

    # Check infile number of task runs filter
    if num_min_task_runs > num_max_task_runs or num_min_task_runs < 0 or num_max_task_runs < 0:
        vprint("ERROR: Can't filter: --min-runs=%s and --max-runs=%s" %
               (str(num_min_task_runs), str(num_max_task_runs)))
        bail = True

    # Check infile task ID filter
    if min_task_id > max_task_id or min_task_id < 0 or max_task_id < 0:
        vprint("ERROR: Can't filter: --min-task-id=%s and --max-task-id=%s" %
               (str(min_task_id), str(max_task_id)))
        bail = True

    # Check exclude file number of task runs filter
    if excl_min_task_id > excl_max_task_id or excl_min_task_id < 0 or excl_max_task_id < 0:
        vprint("ERROR: Can't filter: --excl-min-task-id=%s and --excl-max-task-id=%s" %
               (str(excl_min_task_id), str(excl_max_task_id)))
        bail = True

    # If a validation failed, bail
    if bail:
        return 1

    # Debug point - pertinent parameters
    debug("")
    debug("+----- DEBUG -----")
    debug("|  infile = '%s'" % infile)
    debug("|  outfile = '%s'" % outfile)
    debug("|  null_task_id = '%s'" % str(null_task_id))
    debug("|  num_min_task_runs = '%s'" % str(num_min_task_runs))
    debug("|  num_max_task_runs = '%s'" % str(num_max_task_runs))
    debug("|  Exclusion file = '%s'" % str(exclude_file))
    debug("")

    # == Compare Files == #

    # Container for final JSON object
    filtered_tasks = []
    
    # Cache exclusion file JSON object
    exclude_file_json = None
    if exclude_file is not None:
        exclude_file_open = open(exclude_file, 'r')
        exclude_file_json = json.load(exclude_file_open)
        exclude_file_open.close()

    # Open infile and convert to JSON
    with open(infile, 'r') as open_input_tasks:
        infile_json = json.load(open_input_tasks)
        num_input_tasks = len(infile_json)

        # Loop through all tasks in the input file and filter
        i = 0
        for i_task in infile_json:

            # Update user and reset variables
            write_task = True
            i += 1
            vprint("Processing %s of %s tasks" % (str(i), str(num_input_tasks)))

            # Cache some values
            i_task_runs = i_task['task_runs_nr']
            i_task_id = i_task['id']

            # Debug point
            debug("  DEBUG: i_task_runs = %s" % str(i_task_runs))
            debug("  DEBUG: i_task_id = %s" % str(i_task_id))

            # Filter input file task on task ID
            if min_task_id <= i_task_id <= max_task_id:
                debug("  DEBUG: Passed input file task ID filter")

                # Filter input file task on task runs
                if num_min_task_runs <= i_task_runs <= num_max_task_runs:
                    debug("  DEBUG: Passed input file task run filter")

                # Filter input file task against exclusion file, if one was supplied
                if exclude_file is not None:
                    debug("  DEBUG: Exclude file: %s" % exclude_file)
                    if is_task_in_set(i_task_id, exclude_file_json, min_id=excl_min_task_id,
                                      max_id=excl_max_task_id):
                        debug("  DEBUG: Passed exclude file filter")
                    else:
                        write_task = False
                else:
                    write_task = False
            else:
                write_task = False

            # If the task passed all filters, append to final task list after applying processing steps
            if write_task:
                if null_task_id:
                    i_task['id'] = None
                filtered_tasks.append(i_task)
                vprint("  Passed filters")

    # == Write Final Task Set == #

    if write_final_file:
        vprint("Writing final file...")
        with open(outfile, 'w') as open_outfile:
            result = json.dump(filtered_tasks, open_outfile)

        # Check result
        if result is not None:
            vprint("WARNING: JSON dump may not have succeeded.")

    # == Cleanup == #

    # Update user
    vprint("Found %s remaining tasks" % str(len(filtered_tasks)))
    vprint("Kept %.2f%% of tasks" % (len(filtered_tasks) * 100 / num_input_tasks))
    vprint("Done.")

    # End main()
    return 0


if __name__ == '__main__':
    if len(sys.argv) is 1:
        sys.exit(print_usage())
    else:
        sys.exit(main(sys.argv[1:]))