#! /usr/bin/python

import httplib2
import json
import csv
import datetime
import sys
import os

h = httplib2.Http(".cache")
TIME_FORMAT = "%Y-%m-%d-%H-%M-%S"
OUTDIR = './reports'

timestamp = datetime.datetime.now().strftime(TIME_FORMAT)

try:
	os.makedirs(OUTDIR)
except OSError:
	pass 

def outfile (base, ext = 'csv'):
	return os.path.join (OUTDIR, "%s-%s.%s" % (timestamp, base, ext))


def main (app):

	resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task&format=json" % app, "GET")
	tasks = dict((task['id'], task)
	             for task in json.loads(content))
	
	resp, content = h.request("http://crowdcrafting.org/app/%s/tasks/export?type=task_run&format=json" % app, "GET")
	for result in json.loads(content):
		result['user'] = result['user_id'] or result['user_ip']
		result['created'] = datetime.datetime.strptime(result['created'], '%Y-%m-%dT%H:%M:%S.%f')
		result['finish_time'] = datetime.datetime.strptime(result['finish_time'], '%Y-%m-%dT%H:%M:%S.%f')
		task = tasks[result['task_id']]
		if 'results' not in task:
		    task['results'] = []
		task['results'].append(result)
	
	
	
	with open(outfile("full_results"), "w") as f:
		fieldnames = ['id', 'siteID', 'year', 'county', 'answer', 'user', 'created', 'finished']
		c = csv.DictWriter(f, fieldnames)
		c.writeheader ()
		
		for task in tasks.values():
			if 'results' not in task: continue
			
			taskid = task['id']
			task_info = {
				'id': task['id'], 
				'siteID': task['info'].get('siteID', 'UNKNOWN:%s' % task['id']),
				'year': task['info'].get('year', 'UNKNOWN:%s' % task['id']),
				'county': task['info'].get('county', 'UNKNOWN:%s' % task['id']),
			}
			
			for result in task['results']:
				answer = {
					'answer': result['info']['type'],
					'user': result['user'],
					'created':result['created'].strftime(TIME_FORMAT),
					'finished': result['finish_time'].strftime(TIME_FORMAT)	
					}
				answer.update(task_info)	
				c.writerow(answer)
	
	
	county_results = {}
	            
	with open(outfile("results"), "w") as f:
		fieldnames = ['id', 'siteID', 'year', 'county', 'answer1', 'answer2', 'answer1_count', 'answer2_count', 'answer1_pct', 'answer2_pct',  'total_answers', 'max_answers', 'pct_complete', 'min_created', 'max_created']
		c = csv.DictWriter(f, fieldnames)
		c.writeheader ()
		
		for task in tasks.values():
			taskid = task['id']
			task_info = {
				'id': task['id'], 
				'siteID': task['info'].get('siteID', 'UNKNOWN:%s' % task['id']),
				'year': task['info'].get('year', 'UNKNOWN:%s' % task['id']),
				'county': task['info'].get('county', 'UNKNOWN:%s' % task['id']),
			}


			done = 0
			n_answers = task['n_answers']

			if 'results' in task:
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
				
				row = {
					'answer1': answers[0][0],
					'answer2': answers[1][0],
					'answer1_count': answers[0][1],
					'answer2_count': answers[1][1],
					'answer1_pct': int(100 * answers[0][1] / done),
					'answer2_pct': int(100 * answers[1][1] / done),
					'total_answers': int(done),
					'max_answers': n_answers,
					'pct_complete': int (100 * done/ n_answers),
					'min_created': min_created.strftime(TIME_FORMAT),
					'max_created': max_created.strftime(TIME_FORMAT)
				}
				row.update(task_info)
			else:
				row = task_info	
			
			c.writerow (row)	
			
			county = row['county']	
			if not county in county_results:
				county_results[county] = {'name': county, 'num_tasks': 0, 'done': 0, 'n_answers': 0}
			county_results[county]['num_tasks'] += 1
			county_results[county]['done'] += done
			county_results[county]['n_answers'] += n_answers
			


	with open(outfile("county_results"), "w") as f:
		c = csv.writer(f)
		c.writerow(['county', 'tasks', 'total_answers', 'max_answers', 'pct_complete'])
	
		for county in county_results.values():
			c.writerow([county['name'],county['num_tasks'],county['done'],county['n_answers'], min(100,int(100.0*county['done']/county['n_answers']))])

if len(sys.argv) != 2:
	print "Usage: %s [app short name]" % sys.argv[0]
else:
	main (sys.argv[1])




