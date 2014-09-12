A generic framework for PyBossa client applications, and a set of client applications based on that framework.

# Installation

    virtualenv deps
    source deps/bin/activate
    pip install -r requirements.txt
    

# Usage

The createTasks.py script is a front-end to work with all the applications - to upload them and tasks for them to pybossa. The command

    ./createTasks.py --list
    
will give you a list of all available applications, while

    ./createTasks.py --help
    
will give you the customary help on the command itself and its options.


# Framework structure
Each application is made up of a directory containing set of templates, e.g. categorizer-pad.
All templates are passed through the Django templating engine before uploading.
Django template inheritance is used to share code between apps.
The applion definition from app.json available as template variables.
In particular, {{short_name}} is used for the application name to ensure that renaming apps on the fly during upload, using the -r flag will work.

# Utilities

Using these apps will require you to handle and transform/modify json files containing spatial data, some of them quite large. To help with that there is a toolchain called [swissarmykitchensink](https://github.com/redhog/swissarmykitchensink/blob/master/README.md) which gets installed when you install the dependencies for this project.
