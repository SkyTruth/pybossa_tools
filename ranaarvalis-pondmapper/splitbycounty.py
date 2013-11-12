import json
import sys

with open(sys.argv[1]) as f:
    for line in f:
        try:
            data = json.loads(line)
            with open(data['county'] + ".json", "a") as f2:
                f2.write(line)
        except:
            import pdb
            pdb.set_trace()
        
