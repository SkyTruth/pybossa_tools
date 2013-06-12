#!/usr/bin/env python
# -*- coding: utf-8 -*-

import os
import sys
import os.path
import createTasks
import csv
import json

URL_ROOT = "https://s3-us-west-2.amazonaws.com/drillpadcat/"

def dictreader(rows):
    rows = iter(rows)
    header = rows.next()
    for row in rows:
        yield dict(zip(header, row))

if len(sys.argv) != 4:
    print """Usage: drillpadcatimgtaskload.py http://crowdcrafting.org 00000000-0000-0000-0000-000000000000 somefile.csv

Replace the zeroes with your access key

The csv should contain at least the following columns:

latitude,longitude,path

Path is the path relative to teh root of the drillpadcat s3 bucket.
"""
else:
    with open(sys.argv[3]) as f:
        for row in dictreader(csv.reader(f)):
            row['url'] = URL_ROOT + row.pop("path")
            class options:
                api_url = sys.argv[1]
                api_key = sys.argv[2]
                create_app = False
                update_template = False
                update_tasks = False
                app_root = "drillpadcatimg"
                create_task = json.dumps(row)
                n_answers = 30
                app_name = None
                verbose = False
            createTasks.CreateTasks(options)
