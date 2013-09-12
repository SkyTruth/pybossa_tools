# From http://djangosnippets.org/snippets/2516/

from django import template
from base64 import b64encode

register = template.Library()

@register.filter
def dataURI(filename, mime = None):
    """
    This filter will return data URI for given file, for more info go to:
    http://en.wikipedia.org/wiki/Data_URI_scheme
    Sample Usage:
    <img src="{{ "/home/visgean/index.png"|dataURI }}">
    will be filtered into:
    <img src="data:image/png;base64,iVBORw0...">
    """
    
    with open(filename, "rb") as file:
        data = file.read()
    
    encoded = b64encode(data)
    mime = mime + ";" if mime else ";"
    return "data:%sbase64,%s" % (mime, encoded)
    
