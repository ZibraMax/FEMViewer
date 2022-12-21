class GraphViewer {
	constructor(div, FEMViewer) {
		this.FEMViewer = FEMViewer;
		this.div = div;

		this.data = [];
		// this.data.push(trace1);

		this.layout = {
			title: { text: "Click in point to show modes", font: { size: 18 } },
			font: { size: 18 },
			hovermode: "closest",
			xaxis: {
				title: "$1/R\\ [1/\\mathring{A}]$",
			},
			yaxis: {
				title: "$\\eta [-]$",
			},
			legend: {
				x: 1,
				xanchor: "right",
				y: 1,
				font: { size: 12 },
			},
		};

		this.config = { responsive: true };
		Plotly.newPlot(this.div, this.data, this.layout, this.config);
	}

	changeZ(z) {
		this.z = z;
		this.init(z);
		const trace = {
			x: [0.062277527, 0.078879991, 0.107473265, 0.168512597],
			y: [1.689873418, 1.613924051, 1.379746835, 0.930379747],
			type: "scatter",
			line: { shape: "spline", dash: "dot" },
			name: "Ramirez (2006)",
		};
		this.addTrace(trace);
	}

	async onClick(e) {
		const path = e.points[0].text;
		if (path) {
			const jsonpath = `https://raw.githubusercontent.com/ZibraMax/masters-slides/main/results/${path}`;
			this.FEMViewer.reset();
			await this.FEMViewer.loadJSON(jsonpath);
			this.FEMViewer.init();
			this.FEMViewer.setStep(6);
			document.getElementById("textNodo").innerHTML = `Mode ${
				this.FEMViewer.step + 1
			}`;
		}
	}

	async loadResultsIndex(resultsPath) {
		this.resultsPath = resultsPath;
		const response = await fetch(this.resultsPath);
		const textdata = await response.text();
		this.csvData = Papa.parse(textdata, { dynamicTyping: true }).data;
		this.csvData.shift();
	}
	init(zz) {
		this.z = zz;
		const ls = [];
		this.dict = {};
		for (let i = 0; i < this.csvData.length; i++) {
			const trace = this.csvData[i];
			const l = trace[1];
			const z = trace[2];
			const L = trace[3];
			const text = trace[trace.length - 1];
			const eta = trace[6];
			const R = trace[7];
			if (z == this.z) {
				if (!ls.includes(l)) {
					ls.push(l);
					this.dict[`${l}`] = [];
				}
				const str_l = "" + l.toFixed(1);
				const str_z = "" + z.toFixed(3);
				var str_L = "" + L.toFixed(3);
				str_L = str_L.split(".");
				this.dict[`${l}`].push([1 / R, eta, text]);
			}
		}
		this.data = [];
		for (const l of ls) {
			this.dict[`${l}`].sort();
			const sdata = this.dict[`${l}`][0].map((_, colIndex) =>
				this.dict[`${l}`].map((row) => row[colIndex])
			);
			const trace = {
				x: sdata[0],
				y: sdata[1],
				text: sdata[2],
				type: "scatter",
				line: { shape: "spline" },
				name: `l=${l}`,
			};
			this.data.push(trace);
			// this.addTrace(trace);
		}
		Plotly.newPlot(this.div, this.data, this.layout, this.config);
	}
	addTrace(trace) {
		Plotly.addTraces(this.div, trace);
	}
}
export { GraphViewer };
