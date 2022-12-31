# FEM Viewer

Try it online!!
[https://zibramax.github.io/FEMViewer/](<[images/START.gif](https://zibramax.github.io/FEMViewer/)>)

![](images/START.gif)

A 3D, 2D and 1D FEM results viewer with post process capabilities.

<p float="left">
  <img src="images/1D.png" width="30%" />
  <img src="images/2D.png" width="30%" />
  <img src="images/3D.png" width="30%" />
</p>

Several options to modify the visualization.

![](images/SETTINGS.png)

## Options

### Load JSON

Load JSON file of geometry

### Draw Lines

Allows to display geometry lines

<p float="left">
  <img src="images/3D.png" width="45%" />
  <img src="images/N0_LINES.png" width="45%" />
</p>

### Progress bars

Progress bar for second plane actions. Allows to reload the geometry and stop the redraw of the geometry.

<p float="left">
  <img src="images/PROGRESSBAR.png" width="100%" />
</p>

### Colors

Represent the solution and derivatives as colors

<p float="left">
  <img src="images/COLOR_MODES.png" width="100%" />
  
</p>
<img src="images/COLORS.png" width=100%" />

Use sliders to control the color values

<p align="middle">
<img src="images/COLORS_SLIDER.gif" width=1000%" />
</p>

Different color pallettes

<p float="left">
  <img src="images/COLOR_OPTIONS.png" width="100%" />
  
</p>
<img src="images/COLOR_OPTION.png" width=100%" />

### Click modes

Use the mouse cursor to interact with geometry

<p float="left">
  <img src="images/CLICK_MODE.png" width="100%" />
  
</p>

#### Inspect element

Click in a element to open a separated window. Move the cursor over the element to interpolate the solution

<p float="left">
<img src="images/INSPECT.gif" width=100%" />
<img src="images/INSPECT_2.gif" width=100%" />
  
</p>

#### Delete element

Click in a element to delete it. Just for fun?

<p float="left">
<img src="images/DELETE.gif" width=100%" />
  
</p>

### Displacement animation

For displacement problems, the viewer creates an animation. Yoou can modify the magnifier factor.

<p float="left">
<img src="images/DISP_SLIDER.png" width=100%" />  
</p>

![](images/START.gif)

### Displacement animation

For problems with no displacement field (as temperature or torsion), the viewer can show the solution as colors and as displacement.

<p float="left">
<img src="images/DISPLACEMENT_ANIMATION.gif" width=100%" />  
</p>

### Multiple solutions in the same file

For geometries with different solutions (as eigenvalue problems, time dependent or non-lineal) the viewer allows to select the solution. You can use the left and right arrow to change between solutions

<p align="middle">
<img src="images/DIFFERENT_SOLUTIONS.png" width=30%" />
<img src="images/S1.png" width=30%" />
<img src="images/S2.png" width=30%" />  	
</p>

For each solution, the viewer shows solution information

<p align="middle">
<img src="images/SOLUTION_INFO.png" width=45%" />
<img src="images/SOLUTION_INFO2.png" width=45%" />
</p>

### Histograms

Shows element properties histogram and scaled jacobian histograms

<p align="middle">
<img src="images/HISTOGRAM.png" width=1000%" />
</p>

The viewer shows the element properties with different colors (WIP)

<p align="middle">
<img src="images/ELEMENT_PROPERTIES_WIP.png" width=1000%" />
</p>

### Border element detection

Detects the border elements of a 3D geometry

<p align="middle">
<img src="images/BORDER_DETECTION.gif" width=1000%" />
</p>

And more...

## JSON Geometry input file

WIP

## Examples

Play with them!
