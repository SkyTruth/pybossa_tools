PyBossa client applications

Dependencies:

* Django
* httplib2
* pybossa-client

For mangleresults.py

* shapely
* fastkml

The createTasks.py script is a generic version of the script found in the PyBossa example client, usable for multiple pybossa applications.

Each application is made up of a directory containing set of templates, e.g. frackfinder.

An application can be renamed when uploading, using the -r switch to createTasks.py, which is usefull for testing...

All html templates are passed through the Django templating engine before uploading, with the applion definition from app.json available as template variables.
In particular, use {{short_name}} for the application name to ensure that renaming apps with the -r flag will work.
