#!/usr/bin/env python
# -*- coding: utf-8 -*-

# This file is part of PyBOSSA.
#
# PyBOSSA is free software: you can redistribute it and/or modify
# it under the terms of the GNU Affero General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# PyBOSSA is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU Affero General Public License for more details.
#
# You should have received a copy of the GNU Affero General Public License
# along with PyBOSSA.  If not, see <http://www.gnu.org/licenses/>.

import json
from optparse import OptionParser
import pbclient
import requests
import os.path
import glob

import django.template.loader
import django.conf

django.conf.settings.configure(TEMPLATE_DIRS=(os.path.dirname(__file__),), INSTALLED_APPS=('pybossa_app',))


class CreateTasks(object):
    def handle_arguments(self):
       # Arguments for the application
       usage = "usage: %prog [options]"
       parser = OptionParser(usage)

       parser.add_option("-l", "--list",
                         action="store_true",
                         help="List available applications")

       parser.add_option("-a", "--application",
                         dest="app_root",
                         help="Application name",
                         metavar="APP-NAME",
                         default="drillpad")

       # URL where PyBossa listens
       parser.add_option("-s", "--server", dest="api_url",
                         help="PyBossa URL http://domain.com/", metavar="URL",
                         default="http://localhost:5000/")
       # API-KEY
       parser.add_option("-k", "--api-key", dest="api_key",
                         help="PyBossa User API-KEY to interact with PyBossa",
                         metavar="API-KEY")
       # Create App
       parser.add_option("-c", "--create-app", action="store_true",
                         dest="create_app",
                         help="Create the application")

       # Update template for tasks and long_description for app
       parser.add_option("-u", "--update-template", action="store_true",
                         dest="update_template",
                         help="Update the application")

       parser.add_option("-t", "--load-tasks",
                         dest="load_tasks",
                         help="Load tasks",
                         metavar="TASKS.json")

       parser.add_option("-T", "--create-task",
                         dest="create_task",
                         help="Create a task",
                         metavar='{"JSON":"TASK"}')

       # Update tasks question
       parser.add_option("-q", "--update-tasks",
                         type="int",
                         dest="update_tasks",
                         help="Update Tasks n_answers",
                         metavar="N-ANSWERS")

       # Modify the number of TaskRuns per Task
       # (default 10)
       parser.add_option("-n", "--number-answers",
                         type="int",
                         dest="n_answers",
                         help="Number of answers per task",
                         metavar="N-ANSWERS",
                         default=10)

       parser.add_option("-r", "--rename",
                         dest="app_name",
                         help="Use a different name from the one given with -a as short_name when uploading the app",
                         metavar="APP-NAME",
                         default=None)

       parser.add_option("-v", "--verbose", action="store_true", dest="verbose")
       (options, args) = parser.parse_args()

       if not options.create_app and not options.update_template\
               and not options.create_task and not options.load_tasks and not options.update_tasks and not options.list:
           parser.error("Please check --help or -h for the available options")

       if not options.api_key and not options.list:
           parser.error("You must supply an API-KEY to create an \
                         application and tasks in PyBossa")

       self.options = options


    def get_configuration(self):

       # Load app details
       try:
           with file(os.path.join(self.options.app_root, 'app.json')) as app_json:
               self.app_config = json.load(app_json)
       except IOError as e:
           print "application config file is missing! Please create a new one"
           exit(1)

       self.app_config["short_name"] = os.path.split(os.path.realpath(self.options.app_root))[1]

       if self.options.app_name:
           self.app_config["name"] = self.options.app_name
           self.app_config["short_name"] = self.options.app_name

    def contents(self, filename):
       return django.template.loader.render_to_string(os.path.join(self.options.app_root, filename), self.app_config)

    def find_app_by_short_name(self):
        self.app = self.handle_result(pbclient.find_app(short_name=self.app_config['short_name']))[0]

    def setup_app(self):
        self.find_app_by_short_name()
        self.app.long_description = self.contents('long_description.html')
        self.app.info['task_presenter'] = self.contents('template.html')
        self.app.info['thumbnail'] = self.app_config['thumbnail']
        self.app.info['tutorial'] = self.contents('tutorial.html')

        self.handle_result(pbclient.update_app(self.app))

        staticroot = os.path.realpath(os.path.join(self.options.app_root, 'static'))
        for path, dirs, files in os.walk(staticroot, topdown=False, followlinks=True):
            for filename in files:
                filepath = os.path.join(path, filename)
                with open(filepath) as file:
                    # Remove the prefix and then remove any inherit-symlinks
                    dst = file.name[len(staticroot):].replace("inherit/", "")[1:]
                    print "Uploading %s" % (dst,)
                    print "    from %s" % os.path.realpath(file.name)
                    result = pbclient.add_file(self.app, file, dst)
                    assert result['status'] == 'ok'

    def load_tasks(self):
        with open(self.options.load_tasks) as f:
            for task in json.load(f):
                if 'info' in task:
                    task = task['info']
                    task["question"] = self.app_config['question']
                    task["n_answers"] = self.options.n_answers
                self.handle_result(pbclient.create_task(self.app.id, task))
                print ".",

    def create_task(self):
        # Data for the tasks
        task_info = json.loads(self.options.create_task)
        task_info["question"] = self.app_config['question']
        task_info["n_answers"] = self.options.n_answers
        self.handle_result(pbclient.create_task(self.app.id, task_info))

    def handle_result(self, res):
        if isinstance(res, dict) and res.get('status', 'success') == 'failed':
            raise Exception("Server reported error: %s" % (res['exception_msg'] or res['exception_cls'],))
        return res

    def __init__(self, options = None):
        if options:
            self.options = options
        else:
            self.handle_arguments()

        if self.options.list:
            for appjson in glob.glob(os.path.join(os.path.dirname(__file__), "*", "app.json")):
                with open(appjson) as f:
                    config = json.load(f)
                    config['dirname'] = os.path.split(os.path.split(appjson)[0])[1]
                    print """%(dirname)s
    %(name)s
    %(description)s
""" % config
            return

        self.get_configuration()

        self.handle_result(pbclient.set('api_key', self.options.api_key))
        self.handle_result(pbclient.set('endpoint', self.options.api_url))

        if self.options.verbose:
            print('Running against PyBosssa instance at: %s' % self.options.api_url)
            print('Using API-KEY: %s' % self.options.api_key)

        if self.options.create_app:
            self.handle_result(
                pbclient.create_app(self.app_config['name'],
                                    self.app_config['short_name'],
                                    self.app_config['description']))
            self.setup_app()
        else:
            self.find_app_by_short_name()

        if self.options.load_tasks:
            self.load_tasks()

        if self.options.create_task:
            self.create_task()

        if self.options.update_template:
            print "Updating app template"
            # discard return value
            self.setup_app()

        if self.options.update_tasks:
            def tasks():
                offset = 0
                limit = 100
                while True:
                    tasks = self.handle_result(pbclient.get_tasks(self.app.id, offset=offset, limit=limit))
                    if len(tasks) == 0:
                        break
                    for task in tasks:
                        yield task
                    offset += len(tasks)

            def update_task(task, count):
                print "Updating task: %s" % task.id
                if 'n_answers' in task.info:
                    del(task.info['n_answers'])
                task.n_answers = self.options.update_tasks
                self.handle_result(pbclient.update_task(task))
                count[0] += 1

            print "Updating task n_answers"
            self.find_app_by_short_name()

            n_tasks = [0]
            [update_task(t, n_tasks) for t in tasks()]
            print "%s Tasks have been updated!" % n_tasks[0]

if __name__ == "__main__":
    CreateTasks()
