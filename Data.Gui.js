/**
 * Created by salt on 05.09.2016.
 */
(function() {
	"use strict";
	var DataGui = {
		defaultTemplates: {
			ROOT: 	`<ul class="root">
						<div class="content">
							<span class="node-name"></span>
						</div>
						<ul class="children"></ul>
					</ul>`,

			NODE: 	`<li class="node">
						<div class="content">
							<span class="node-name"></span>
						</div>
						<ul class="children"></ul>
					</li>`,

			FOLDER: `<li class="folder">
						<div class="content">
							<span class="node-name"></span>
						</div>
						<ul class="children"></ul>
					</li>`
		}
	};

	class Node {
		constructor(parent) {
			this._leaf 	= true;
			this._childs = [];
			this._weight = 0;
			this._parent = parent;
			this._color	= "gray";
			this._domTemplate = DataGui.defaultTemplates.NODE;
			this._dom;
		}
		createDom() {
			var wrapper = document.createElement('ul');
			wrapper.innerHTML = this._domTemplate;
			this._dom = wrapper.firstChild.cloneNode(true);
			this._dom.style.borderLeftColor = this._color;
		}
		update() {
			//this.color(this._color);
		}
		updateAll() {
			var rec = function(node) {
				node.update();
				if (node._leaf) return;
				for (var i = 0; i < node._childs.length; i++) {
					rec(node._childs[i]);
				}
			}
			rec(this);
		}
		add(type, ...args) {
			if (this._leaf) console.error("Leaf nodes can't have childes!");
			if (!(type in DataGui.nodeTypes)) console.error("No NodeType '%s' found!", type);
			var node = new DataGui.nodeTypes[type](this, ...args);
				node.createDom();
			this._childs.push(node);
			//reDraw
			this.reDrawChilds();
			return node;
		}
		remove() {
			//@todo implement
		}
		reDrawChilds() {
			//clear
			var childContainer = this._dom.querySelector(".children");
			childContainer.innerHTML = "";

			//sort child
			var weigh = function(a, b) {
				if (a._weight == b._weight) return 0;
				return (a._weight < b._weight)? -1: 1;
			};
			this._childs = this._childs.sort(weigh);
			//append childs
			var frag = document.createDocumentFragment();
			for (var i = 0; i < this._childs.length; i++) {
				frag.appendChild(this._childs[i]._dom);
			}

			this._dom.querySelector(".children").appendChild(frag);
		}
		color(colorString) {
			if (typeof colorString === "string") this._color = colorString;
			this._dom.style.borderLeftColor = this._color;
			return this;
		}
		// get prop() {
		// 	return 'getter';
		// }
		// set prop(value) {
		// 	console.log('setter: '+value);
		// }
	}

	class Root extends Node {
		constructor(parentDom) {
			super();
			this._leaf = false;
			this.outerDom = parentDom;
			this._domTemplate = DataGui.defaultTemplates.ROOT;
			this._parent = this;
			this._dom = parentDom;
			this.createDom();
			this.outerDom.appendChild(this._dom);
		}
		remove() {
			//@todo remove hole DataGui instance
		}
	}
	class Folder extends Node {
		constructor(parentDom, name) {
			super();
			this._leaf = false;
			this.name = name || "No Name";
			this._domTemplate = DataGui.defaultTemplates.FOLDER;
		}
		update() {
			this._dom.querySelector(".node-name").innerHTML = this.name;
		}
		color(colorString) {
			this._dom.style.borderColor = colorString;
			return this;
		}
		createDom() {
			super.createDom();
			this._dom.querySelector(".content").addEventListener("click", function(e) {
				this.parentNode.classList.toggle("close")
			});
		}
	}

	class ObserverNode extends Node {
		constructor(parent, object, propertyName) {
			super(parent);
			this._object 		= object;
			this._propertyName 	= propertyName;
			this._value = null;
		}
		listen() {
			// Object.observe(this._object, function(changes) {
			// 	console.log(changes);
			// }, [this._propertyName]);
		}
		observeValue() {
			if (this._propertyName in this._object){
				if (this._value !== this._object[this._propertyName]) {
					this._value = this._object[this._propertyName];
					//@todo event
					this.update();
				}
			}
		}
	}
	class Value extends ObserverNode {
		constructor(parent, name, object, propertyName) {
			if (object[propertyName] === null ||
				typeof object[propertyName] === "object" ||
				typeof object[propertyName] === "function") console.error("Value of property '%S' is null");

			super(parent, object, propertyName);
			this.name 			= name;
			this.valueType 		= typeof this._object[this._propertyName];
			this._domTemplate 	= `<li class="value">
										<div class="content">
											<span class="node-name">Root</span>
											<span class="value-side">
												<input class="value" type="text" />
											</span>
										</div>
										<ul class="children"></ul>
									</li>`;
		}
		update() {
			this._dom.querySelector(".node-name").innerHTML = this.name;
			this._dom.querySelector(".value").value = this._object[this._propertyName];
		}
		createDom() {
			super.createDom();
			var type = this.valueType;
			switch(this.valueType) {
				case "string": 	type = "text"; 		break;
				case "boolean": type = "checkbox"; 	break;
				case "number": 	type = "number"; 	break;
			}
			var value = this._dom.querySelector(".value-side>.value");
			value.setAttribute("type", type)
			value.addEventListener("change", function(e) {
				this._object[this._propertyName] = e.target.value;
			}.bind(this));

		}
	}
	class Range extends Value {
		constructor(parent, name, object, propertyName, min = 0, max = 1) {
			super(parent, name, object, propertyName);
			this.ESliderTrack = null;
			this.ESliderLevel = null;
			this.level = 0.5;
			this.min = 0;
			this.max = 42;
			this._domTemplate = `<li class="range">
									<div class="content">
										<span class="node-name">Range</span>
										<span class="value-side">
										<input class="value" type="number" />
											<div class="slider-track">
												<div class="slider-level"></div>
											</div>
										</span>
									</div>
									<ul class="children"></ul>
								</li>`;
		}
		set(value) {
			this.level = Math.max(0, Math.min(1, value));
			this.ESliderLevel.querySelector(".slider-level").style.width = (this.level * 100) + "%";

			this._dom.querySelector(".value").value = this.level * this.max;
			//@todo update object property value
		}
		createDom() {
			super.createDom();
			this.ESliderTrack = this._dom.querySelector(".slider-track");
			this.ESliderLevel = this._dom.querySelector(".slider-track");
			var self = this;

			this.ESliderLevel.addEventListener("mousedown", function(e) {
				var pressed = true,
					posX = 0;

				posX = e.offsetX;
				self.set(e.offsetX / (self.ESliderTrack.clientWidth - 1));

				var onMouseMove = function(e) {
					if (pressed) {
						var val = Math.max(0, posX += e.movementX);
						self.set(val / self.ESliderLevel.clientWidth);
					}
				};
				var onMouseUp = function(e) {
					pressed = false;
					document.removeEventListener("mousemove", onMouseMove);
					document.removeEventListener("mouseup", onMouseUp);
				};
				document.addEventListener("mousemove", onMouseMove);
				document.addEventListener("mouseup", onMouseUp);
			});
		}
		update() {
			this.level = this._object[this._propertyName] / this.max;
			this._dom.querySelector(".node-name").innerHTML = this.name;
			this._dom.querySelector(".value").value = this.level;
		}
		min(value) {
			if (typeof value !== "number") console.error("min value type must be a number");
			this.min = value;
		}
		max(value) {
			if (typeof value !== "number") console.error("max value type must be a number");
			this.max = value;
		}
		max(value) {}
	}
	/**
	 * creates a folder with all props' and a comandline to inject commands
	 */
	var bb = {
		valueName: {
			//
		}
	};
	class Obj extends Folder {
		constructor(parent, name, object, config = {}) {
			super(parent, name);
			this._object = object;
			this._config = config;
			// this._domTemplate = `<li class="value">
			// 						<div class="content">
			// 							<span class="node-name">Root</span>
			// 							<span class="value-side">
			// 								<input class="value" type="checkbox" />
			// 							</span>
			// 						</div>
			// 						<ul class="children"></ul>
			// 					</li>`;
			//@todo iterate config and add childs
		}
		createDom() {
			super.createDom();
			this._dom.querySelector(".content").addEventListener("click", function(e) {
				this.parentNode.classList.toggle("close")
			});
			for(var propName in this._object) {
				let type = typeof this._object[propName];
				if (type !== "function" && type !== "object" && type !== "null") {
					this.add("Value", propName, this._object, propName);
				}
			}
		}
	}

	class Button extends ObserverNode {
		constructor(parent, name, object, propertyName) {
			if ((!(propertyName in  object) || typeof object[propertyName] !== "function") && typeof object !== "function") {
				console.error("Value of property '%S' is not a function");
			}
			super(parent, object, propertyName);
			this.name 			= name;
			this.valueType 		= typeof this._object[this._propertyName];
			this._domTemplate 	= `<li class="button">
										<div class="content">
											<span class="node-name">Button</span>
										</div>
										<ul class="children"></ul>
									</li>`;
		}
		createDom() {
			super.createDom();
			this._dom.querySelector(".node-name").style.color = this.color;
			this._dom.querySelector(".content").addEventListener("click", function() {
				if (typeof this._object === "function") {
					//call object
					this._object();
				} else if (this._propertyName in this._object){
					//call on object
					this._object[this._propertyName].call(this._object, null);
				}
			}.bind(this));
			this._dom.querySelector(".content").addEventListener("click", function() {
				if (typeof this._object === "function") {
					//call object
					this._object();
				} else if (this._propertyName in this._object){
					//call on object
					this._object[this._propertyName].call(this._object, null);
				}
			}.bind(this));
		}
		update() {
			var name = this._dom.querySelector(".node-name");
			name.innerHTML = this.name;
		}
	}

	class CBuffer {
		constructor() {
			this.size = this.start = 0;
			if (arguments.length > 1 || typeof arguments[0] !== 'number') {
				this.data = new Array(arguments.length);
				this.end = (this.length = arguments.length) - 1;
				this.push.apply(this, arguments);
			} else {
				this.data = new Array(arguments[0]);
				this.end = (this.length = arguments[0]) - 1;
			}
		}
		push() {
			var i = 0;
			for (; i < arguments.length; i++) {
				this.data[(this.end + i + 1) % this.length ] = arguments[i];
			}
			// recalculate size
			if (this.size < this.length) {
				if (this.size + i > this.length) this.size = this.length;
				else this.size += i;
			}
			// recalculate end
			this.end = (this.end + i) % this.length;
			// recalculate start
			this.start = this.end - this.size + 1;
			if (this.start < 0) this.start += this.length;
			// return number current number of items in CBuffer
			return this.size;
		}
		// shift first item
		shift() {
			var item;
			// check if there are any items in CBuff
			if (this.size === 0) return undefined;
			// store first item for return
			item = this.data[ this.start ];
			// delete first item from memory
			delete this.data[ this.start ];
			// recalculate start of CBuff
			this.start = (this.start + 1) % this.length;
			// decrement size
			this.size--;
			return item;
		}
		first() {
			return this.data[ this.start ];
		}
		last() {
			return this.data[ this.end ];
		}
		idx (arg) {
			return this.data[(this.start + arg) % this.length ];
		}
		iter(){
			var nextIndex = 0;

			return {
				next: function(){
					return nextIndex < array.length ?
					{value: array[nextIndex++], done: false} :
					{done: true};
				}
			}
		}
	}

	class Monitor extends ObserverNode {
		constructor(parent, name, object, propertyName) {
			super(parent, object, propertyName);

			this.name = name;
			this._ctx = null;
			this._canvas = null;
			this._width = 0;
			this._height = 0;
			this._min = 0;
			this._max = 0;
			this._autoScale = true;
			this._data = new CBuffer(60);
			this._pointDistance = 4;
			this._domTemplate 	= `<li class="monitor">
										<div class="content">
											<span class="node-name">Canvas</span>
											<canvas class="canvas"></canvas>
										</div>
										<ul class="children"></ul>
									</li>`;
			parent.add("Value", "Point distance", this, "_pointDistance")
		}
		createDom() {
			super.createDom();
			this._canvas = this._dom.querySelector(".canvas");
			this._ctx = this._canvas.getContext("2d");
			this._width = this._canvas.width;
			this._height = this._canvas.height;

			//@todo remove dirty timeout
			setInterval(function() {
				this.observeValue();
				this._data.push(this._value);
				if (this._autoScale) {
					if (this._value < this._min) this._min = this._value;
					if (this._value > this._max) this._max = this._value;
				}
				this.updateCtx();
			}.bind(this),100);
		}
		updateCtx() {
			var scale = this._height / (this._max - this._min),
				offset = 0 - this._min * scale;

			this._ctx.clearRect(0, 0, this._width, this._height);
			this._ctx.beginPath();
			this._ctx.strokeStyle = "#0f0";
			// this._ctx.moveTo(0, 50);
			this._ctx.moveTo(this._width + 100, 0);
			for (let i = 0; i < this._data.size; i++) {
				let value = this._data.idx((this._data.size - 1) - i);
				value *= scale;
				value += offset;
				value = this._height - value;
				this._ctx.lineTo(this._width - (i * this._pointDistance), value);
			}
			this._ctx.stroke();
			//draw size
			this._ctx.beginPath();
			this._ctx.strokeStyle = "#f00";
			this._ctx.moveTo(2, 0);
			this._ctx.lineTo(2, this._height);
			this._ctx.stroke();

			this._ctx.font="14px Georgia";
			this._ctx.fillStyle = "#f00";
			let value = this._data.last();
			this._ctx.fillText(this._value.toFixed(3),this._width - 100, this._height - (value * scale + offset));
			this._ctx.fillText(this._max.toFixed(3),10,10);
			this._ctx.fillText(this._min.toFixed(3),10,this._height - 10);

		}
		update() {
			this._dom.querySelector(".node-name").innerHTML = this.name;
		}
	}


	window.dataGui = DataGui;
	window.dataGui.nodeTypes = {};
	window.dataGui.nodeTypes["Node"] 	= Node;
	window.dataGui.nodeTypes["Folder"] 	= Folder;
	window.dataGui.nodeTypes["Value"] 	= Value;
	window.dataGui.nodeTypes["Range"] 	= Range;
	window.dataGui.nodeTypes["Button"] 	= Button;

	window.dataGui.nodeTypes["Monitor"] = Monitor;
	window.dataGui.nodeTypes["Obj"] 	= Obj;

	window.dataGui.create = function(parentDom) {
		parentDom.classList.add('DataGui');
		var r = new Root(parentDom);
		return r;
	};
})();