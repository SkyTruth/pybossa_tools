#! /usr/bin/python

import httplib2
import fastkml
import shapely.geometry
import json
import csv
import datetime
import sys

# import psycopg2
# import dbconfig

# c = psycopg2.connect(dbconfig.dsn)
# cur = c.cursor()


h = httplib2.Http(".cache")

resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task&format=json" % sys.argv[1], "GET")
tasks = dict((task['id'], task)
             for task in json.loads(content))

resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task_run&format=json" % sys.argv[1], "GET")
for result in json.loads(content):
    result['created'] = datetime.datetime.strptime(result['created'], '%Y-%m-%dT%H:%M:%S.%f')
    result['finish_time'] = datetime.datetime.strptime(result['finish_time'], '%Y-%m-%dT%H:%M:%S.%f')
    task = tasks[result['task_id']]
    if 'results' not in task:
        task['results'] = []
    task['results'].append(result)

TIME_FORMAT = "%Y-%m-%d %H:%M:%S.%f"

with open("full_results.csv", "w") as f:
    c = csv.writer(f)
    c.writerow(['answer', sys.argv[2], 'user', 'created', 'finished'])

    for task in tasks.values():
        if 'results' not in task: continue
        for result in task['results']:
            c.writerow([result['info']['type'],
                        task['info'].get(sys.argv[2], 'UNKNOWN:%s' % task['id']),
                        result['user_id'],
                        result['created'].strftime(TIME_FORMAT),
                        result['finish_time'].strftime(TIME_FORMAT)])
            
with open("results.csv", "w") as f:
    c = csv.writer(f)
    c.writerow(['answer', 'answer2', 'certainty', 'certainty2', 'done', 'n_answers', sys.argv[2], 'min_created', 'max_created'])

    for task in tasks.values():
        if 'results' not in task: continue
        answers = {}
        min_created = None
        max_created = None
        for result in task['results']:
            answer = result['info']['type']
            if answer not in answers:
                answers[answer] = 1
            else:
                answers[answer] += 1
            if min_created is None or min_created > result['created']:
                min_created = result['created']
            if max_created is None or max_created < result['created']:
                max_created = result['created']
        answers = answers.items()
        answers.sort(lambda a, b: cmp(a[1], b[1]), reverse=True)
        
        answers.append(('', 0))
        answers.append(('', 0))

        done = float(len(task['results']))
        c.writerow([answers[0][0],
                    answers[1][0],
                    int(100 * answers[0][1] / done),
                    int(100 * answers[1][1] / done),
                    int(done),
                    task['n_answers'],
                    task['info'].get(sys.argv[2], 'UNKNOWN:%s' % task['id']),
                    min_created.strftime(TIME_FORMAT),
                    max_created.strftime(TIME_FORMAT)])


k = fastkml.kml.KML()
with open("counties.kml") as f:
    k.from_string(f.read())
counties = {}
for county in k.features().next().features().next().features():
    counties["%s%s" % (county.name, county.description)] = {'geom': county.geometry, 'tasks': {}, 'done': 0, 'n_answers': 0}

print "XXXX", len(counties)

for id, task in tasks.iteritems():
    point = shapely.geometry.Point(float(task['info']['longitude']), float(task['info']['latitude']))
    for name, county in counties.iteritems():
        if county['geom'].contains(point):
            county['tasks'][id] = task
            break
    
for name, county in counties.iteritems():
    for task in county['tasks'].values():
        county['n_answers'] += task['n_answers']
        county['done'] += float(len(task.get('results', [])))

with open("county-results.csv", "w") as f:
    c = csv.writer(f)
    c.writerow(['doneprcnt', 'done', 'n_answers', 'county'])

    for name, county in counties.iteritems():
        if county['done'] > 0:
            c.writerow([int(100 * county['done'] / county['n_answers']), county['done'], county['n_answers'], name])
