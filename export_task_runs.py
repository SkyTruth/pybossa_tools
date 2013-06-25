#! /usr/bin/python

import httplib2
import json
import csv
import datetime
import sys

h = httplib2.Http(".cache")


def main (app):
	resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task&format=json" % app, "GET")
	tasks = dict((task['id'], task)
	             for task in json.loads(content))
	
	resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task_run&format=json" % app, "GET")
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
		c.writerow(['id', 'siteID', 'year', 'county', 'answer', 'user', 'created', 'finished'])
		
		for task in tasks.values():
			taskid = task['id']
			siteid = task['info'].get('siteID', 'UNKNOWN:%s' % task['id'])
			year = task['info'].get('year', 'UNKNOWN:%s' % task['id'])
			county = task['info'].get('county', 'UNKNOWN:%s' % task['id'])
			if 'results' not in task: continue
			for result in task['results']:
				c.writerow([taskid, siteid,year,county,
					result['info']['type'],
							result['user_id'],
							result['created'].strftime(TIME_FORMAT),
							result['finish_time'].strftime(TIME_FORMAT)])
	
	
	county_results = {}
	            
	with open("results.csv", "w") as f:
		c = csv.writer(f)
		c.writerow(['id', 'siteID', 'year', 'county', 'answer1', 'answer2', 'answer1_count', 'answer2_count', 'answer1_pct', 'answer2_pct',  'total_answers', 'max_answers', 'pct_complete', 'min_created', 'max_created'])
	
		for task in tasks.values():
			if 'results' not in task: continue

			taskid = task['id']
			siteid = task['info'].get('siteID', 'UNKNOWN:%s' % task['id'])
			year = task['info'].get('year', 'UNKNOWN:%s' % task['id'])
			county = task['info'].get('county', 'UNKNOWN:%s' % task['id'])
			
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
			n_answers = task['n_answers']
			if not county in county_results:
				county_results[county] = {'name': county, 'num_tasks': 0, 'done': 0, 'n_answers': 0}
			county_results[county]['num_tasks'] += 1
			county_results[county]['done'] += done
			county_results[county]['n_answers'] += n_answers
			
			c.writerow([taskid, siteid,year,county,answers[0][0],
						answers[1][0],
						answers[0][1],
						answers[1][1],
						int(100 * answers[0][1] / done),
						int(100 * answers[1][1] / done),
						int(done),
						n_answers,
						int (100 * done/n_answers),
						min_created.strftime(TIME_FORMAT),
						max_created.strftime(TIME_FORMAT)])
#						task['info'].get('siteID', 'UNKNOWN:%s' % task['id']),


	with open("county_results.csv", "w") as f:
		c = csv.writer(f)
		c.writerow(['county', 'tasks', 'total_answers', 'max_answers', 'pct_complete'])
	
		for county in county_results.values():
			c.writerow([county['name'],county['num_tasks'],county['done'],county['n_answers'], int(100.0*county['done']/county['n_answers'])])

if len(sys.argv) != 2:
	print "Usage: %s [app short name]" % sys.argv[0]
else:
	main (sys.argv[1])




