import json
import sys

counties = {}
with open(sys.argv[1]) as f:
    for data in json.loads(f.read()):
        if data['county'] not in counties: counties[data['county']] = []
        counties[data['county']].append(data)

for county, rows in counties.iteritems():
    with open(county + ".json", "w") as f2:
        f2.write(json.dumps(rows))
        
