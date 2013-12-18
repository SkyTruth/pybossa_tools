#! /usr/bin/env python

import json
import jsonpath
import sys

if len(sys.argv) < 4:
    print """Edits json files using jsonpaths

For more information on jsonpaths see http://goessner.net/articles/JsonPath/

There are three possible usages:

jsonedit.py infile.json outfile.json '$..bbox'
    This will compile a list of all bbox attribute values

jsonedit.py infile.json outfile.json '$..options' '{"layer": "47-11"}'
   This will replace all options attribute values with the json object {"layer": "47-11"}

jsonedit.py infile.json outfile.json '$..bbox' delete
   This will delete all bbox attributes
"""
    sys.exit(0)

def main(input, output, query, replacement = None):
    delete = False
    replace = False
    if replacement == 'delete':
        delete = True
    elif replacement:
        replace = True
        replacement = json.loads(replacement)


    with open(input) as f:
        data = json.load(f)

    if replace or delete:
        for path in jsonpath.jsonpath(data, query, "path"):
            path, item = path.rsplit("[", 1)
            item = item[1:-2] # remove ' and ']
            obj = jsonpath.jsonpath(data, path)[0]
            if isinstance(obj, (list, tuple)): item = int(item)
            if delete:
                del obj[item]
            else:
                obj[item] = replacement
    else:
        data = jsonpath.jsonpath(data, query)

    with open(output, "w") as f:
        json.dump(data, f)

main(*sys.argv[1:])
