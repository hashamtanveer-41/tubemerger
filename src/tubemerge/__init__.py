"""Backward compatibility shim redirecting legacy tubemerge imports to tubemerger."""

import sys
import tubemerger

# Alias tubemerge module to tubemerger in sys.modules
sys.modules[__name__] = tubemerger
