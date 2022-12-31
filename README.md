# FEM Viewer

Try it online!!
[https://zibramax.github.io/FEMViewer/](https://zibramax.github.io/FEMViewer/)

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

The viewer shows the element properties with different colors

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

The input JSON file must have the following structure

| Field                 | Description                                 | Type          |
| --------------------- | ------------------------------------------- | ------------- |
| nodes                 | Coordinate matrix of nodes in geometry      | Array         |
| dictionary            | Element conectivity matrix                  | Array         |
| types                 | Type oof elements in the geometry           | Array, String |
| ebc                   | Essential border conditions matrix          | Array         |
| nbc                   | Natural border conditions matrix            | Array         |
| ngdl                  | Number of degrees of freedom of geometry    | int           |
| nvn                   | Number of variables per node                | int           |
| properties (optional) | Object with the specific problem properties | Object        |
| solutions (optional)  | Array of solution objects                   | Array         |

### nodes Array(Array(Double))

Vertical matrix of coordinate. Each row represents a node and each column a coordinate.

Example: A 3D geometry with 4 nodes has a 4x3 matrix of nodes

```json
{
	"nodes": [
		[0.0, 0.0, 0.0],
		[1.0, 0.0, 0.0],
		[0.0, 1.0, 0.0],
		[0.0, 0.0, 1.0]
	]
}
```

Example: A 2D geometry with 3 nodes has a 3x2 matrix of nodes

```json
{
	"nodes": [
		[0.0, 0.0],
		[1.0, 0.0],
		[0.0, 1.0]
	]
}
```

Example: A 1D geometry with 2 nodes has a 2x1 matrix of nodes

```json
{
	"nodes": [[0.0], [1.0]]
}
```

### dictionary Array(Array(Int))

Element conectivity matrix. Each row represents an element and each column a node of the element. The element specific order is the same as used in [AFEM](https://zibramax.github.io/FEM/FEM/FEM.Elements.html). The value of the matrix represent the index (0 based) of the nodes matrix.

Example: A geometry with 2 triangular elements

```json
{
	"dictionary": [
		[0, 1, 2],
		[1, 3, 2]
	]
}
```

### types Array(String) or String

A list of the type of each element. If string, assumes that all elements have the same type.

Supperted types:

| Key  | Description                |
| ---- | -------------------------- |
| L1V  | 1D Line of 2 nodes         |
| L2V  | 1D Line of 3 nodes         |
| C1V  | 2D Rectangle of 4 nodes    |
| C2V  | 2D Rectange of 8 nodes     |
| T1V  | 2D Triangle of 3 nodes     |
| C2V  | 2D Triangle of 6 nodes     |
| B1V  | 3D Cube of 8 nodes         |
| B2V  | 3D Cube of 20 nodes        |
| TE1V | 3D Tetrahedral of 4 nodes  |
| TE2V | 3D Tetrahedral of 10 nodes |

Example: A geometry with 2 3-node triangular elements

```json
{
	"types": ["T1V", "T1V"]
}
```

### ebc Array(Array(Double))

Essential border condition matrix. Each row is a border condition. The first column is the node where the border condition is applied (0-th based index). The second column is the value of the border condition.

Example: A geometry where the first two nodes have essential border condition.

```json
{
	"ebc": [
		[0, 1.234],
		[1, 0.453]
	]
}
```

### nbc Array(Array(Double))

Same as ebc

### ngdl int

Number of degrees of freedom

### nvn int

Number of variables per node

### properties

An object that contains the following fields:

-   problem (String)
-   description (String)
-   especific problem properties (Array)
    -   Depending on the problem, the properties varies. For instance, the Torsion2D properties are:
        -   \_phi
        -   G

Full problem properties table:

WIP

### solutions

An Array that contains solutions. Each solution has the following fields:

-   U: Solution for each degree of freedom
-   info: An object that contains additional solution information

For example:

```json
{
	"solutions": [
		{ "U": [0.0, 2.0, 2.0, 1.0, 0.0], "info": { "solver": "Lineal" } },
		{ "U": [0.0, 2.0, 2.0, 1.0, 0.0], "info": {} }
	]
}
```

Full Example:

```json
{
	"nodes": [
		[0.0, 0.0],
		[1, 0.0],
		[1, 1],
		[0, 1]
	],
	"dictionary": [[0, 1, 2, 3]],
	"types": ["C1V"],
	"ebc": [],
	"nbc": [],
	"nvn": 1,
	"ngdl": 4,
	"properties": {
		"verbose": false,
		"name": "",
		"problem": "Torsion2D",
		"_phi": null,
		"G": [1],
		"duration": 1,
		"description": ""
	}
}
```

## Examples

Play with them!
