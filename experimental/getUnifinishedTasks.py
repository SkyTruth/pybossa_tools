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


def main(args):

    """
    Main routine.
    """

    # == Cache defaults and containers == #


    # Input/output files
    input_tasks = None
    processed_tasks = None
    outfile = None

    # Cache filtering defaults
    num_min_responses = 0
    num_max_responses = 10

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
            try:
                num_min_responses = int(arg.split('=')[1])
            except TypeError:
                vprint("ERROR: Arg '--min-responses=int' must be an integer")
                arg_error = True
        elif '--max-responses=' in arg:
            try:
                num_max_responses = int(arg.split('=')[1])
            except TypeError:
                vprint("ERROR: Arg '--max-responses=int' must be an integer")
                arg_error = True

        # Processing options
        elif arg in ('--null-task-id', '-null-task-id', '-nti'):
            null_task_id = True

        # Ignore completely empty arguments
        elif arg == '':
            pass

        # Assume some things about the argument
        else:
            # If the input_tasks file has not been defined, assume argument is the infile
            if input_tasks is None:
                input_tasks = arg
            # If the processed_tasks file file has not been defined, assume argument is the outfile
            elif processed_tasks is None:
                processed_tasks = arg
            # If input_tasks and processed_tasks files have been defined, assume argument is the outfile
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
    if input_tasks is not None or not isfile(input_tasks):
        vprint("ERROR: Can't find file containing input tasks: %s" % input_tasks)
        bail = True
    if outfile is not None and isfile(outfile):
        vprint("ERROR: Output file exists: %s" % outfile)
        bail = True
    if num_min_responses > num_max_responses:
        vprint("ERROR: Can't filter: --min-responses > --max-responses")
        bail = True
    if not os.access(input_tasks, os.R_OK):
        vprint("ERROR: Need read permission for tasks file: %s" % input_tasks)
        bail = True
    if not os.access(processed_tasks, os.R_OK):
        vprint("ERROR: Need read permission for task runs file: %s" % processed_tasks)
        bail = True
    if not os.access(dirname(outfile), os.W_OK):
        vprint("ERROR: Need write permission on directory: %s" % outfile)
        bail = True
    if bail:
        return 1

    # Debug point - pertinent parameters
    debug("")
    debug("+-- DEBUG ---")
    debug("|  input_tasks = '%s'" % input_tasks)
    debug("|  processed_tasks = '%s'" % processed_tasks)
    debug("|  outfile = '%s'" % outfile)
    debug("|  null_task_id = '%s'" % str(null_task_id))
    debug("|  num_min_responses = '%s'" % str(num_min_responses))
    debug("|  num_max_responses = '%s'" % str(num_max_responses))
    debug("")


    # == Compare Files == #


    # == Write File == #


    # == Cleanup == #








    return 0


if __name__ == '__main__':
    if len(sys.argv) is 1:
        sys.exit(print_usage())
    else:
        sys.exit(main(sys.argv[1:])