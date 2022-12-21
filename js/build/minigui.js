import * as THREE from "../build/three.module.js";
class MinMaxGUIHelper {
	constructor(obj, minProp, maxProp, minDif) {
		this.obj = obj;
		this.minProp = minProp;
		this.maxProp = maxProp;
		this.minDif = minDif;
	}
	get min() {
		return this.obj[this.minProp];
	}
	set min(v) {
		this.obj[this.minProp] = v;
		this.obj[this.maxProp] = Math.max(
			this.obj[this.maxProp],
			v + this.minDif
		);
	}
	get max() {
		return this.obj[this.maxProp];
	}
	set max(v) {
		this.obj[this.maxProp] = v;
		this.min = this.min; // this will call the min setter
	}
}
class AxisGridHelper {
	constructor(node, units = 10) {
		const axes = new THREE.AxesHelper();
		axes.material.depthTest = false;
		axes.renderOrder = 2; // after the grid
		node.add(axes);

		const grid = new THREE.GridHelper(units, units);
		grid.material.depthTest = false;
		grid.renderOrder = 1;
		grid.rotateX(Math.PI / 2);
		node.add(grid);

		this.grid = grid;
		this.axes = axes;
		this.visible = true;
	}
	get visible() {
		return this._visible;
	}
	set visible(v) {
		this._visible = v;
		this.grid.visible = v;
		this.axes.visible = v;
	}
}

class ColorGUIHelper {
	constructor(object, prop) {
		this.object = object;
		this.prop = prop;
	}
	get value() {
		return `#${this.object[this.prop].getHexString()}`;
	}
	set value(hexString) {
		this.object[this.prop].set(hexString);
	}
}
export { AxisGridHelper, MinMaxGUIHelper, ColorGUIHelper };
