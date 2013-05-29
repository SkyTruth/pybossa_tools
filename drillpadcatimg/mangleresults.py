#! /usr/bin/python

import httplib2
import json
import csv
import datetime

h = httplib2.Http(".cache")

resp, content = h.request("http://crowdcrafting.org/app/drillpadcatimg/tasks/export?type=task&format=json", "GET")
tasks = dict((task['id'], task)
             for task in json.loads(content))

resp, content = h.request("http://crowdcrafting.org/app/drillpadcatimg/tasks/export?type=task_run&format=json", "GET")
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
    c.writerow(['answer', 'filename', 'user', 'created', 'finished'])

    for task in tasks.values():
        for result in task['results']:
            c.writerow([result['info']['type'],
                        task['info']['url'],
                        result['user_id'],
                        result['created'].strftime(TIME_FORMAT),
                        result['finish_time'].strftime(TIME_FORMAT)])
            
with open("results.csv", "w") as f:
    c = csv.writer(f)
    c.writerow(['answer', 'answer2', 'certainty', 'certainty2', 'filename', 'min_created', 'max_created'])

    for task in tasks.values():
        n_answers = 0.0
        answers = {}
        min_created = None
        max_created = None
        for result in task['results']:
            n_answers += 1
            answer = result['info']['type']
            if answer not in answers:
                answers[answer] = 0
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

        c.writerow([answers[0][0],
                    answers[1][0],
                    int(100 * answers[0][1] / n_answers),
                    int(100 * answers[1][1] / n_answers),
                    task['info']['url'],
                    min_created.strftime(TIME_FORMAT),
                    max_created.strftime(TIME_FORMAT)])
