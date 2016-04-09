/** 
The MIT License (MIT)

Copyright (c) 2016 Frederic Condolo

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
**/

var PickableUniqueIndex = 0;


/**
 * @constructor
 */
function  Pickable(type, radius, x, y, color, keyf, parentDiv) {
	var t = this;
	t.type = type;
	t.radius = radius;
	t.x = x;
	t.y = y;
	t.color = color;
	t.keyf = keyf;
	t.parentDiv = parentDiv;
	t.div = parentDiv.appendChild(document.createElement("div"));
	t.div.id = "pickable"+PickableUniqueIndex;
	t.div.onmousedown = function(event) {
		t.onMouseDown(event);
	};
	t.div.onmouseup = function(event) {
		t.onMouseUp(event);
	};
	t.div.onmousemove = function(event) {
		t.onMouseMove(event);
	};
	t.div.onmouseover = function() {
		t.div.style.cursor = 'move';
	};	
	t.div.onmouseleave = function() {
		t.onMouseLeave();
	};
		
	t.div.className = "pickable";
	t.div.style.top = x+"px";
	t.div.style.left = y+"px";
	t.mousedown = false;
	
	PickableUniqueIndex++;
}

Pickable.prototype = {

	beforeDelete : function () {
		var t = this;
		t.parentDiv.removeChild(t.div);
	},
	
	onMouseDown : function (event){
		var t = this;
		t.mousedown = true;
		t.div.className = "selected";
	},

	onMouseUp : function (event){
		var t = this;
		t.mousedown = false;
		t.div.className = "pickable";
	},

	onMouseLeave : function (event){
		var t = this;
		t.mousedown = false;
		t.div.className = "pickable";
	},

	onMouseMove : function (event){
		var t = this;
		if (t.mousedown) {
			var position = t.parentDiv.getBoundingClientRect();
			dirty = true;
			var d = cvs.height/ny;
			t.keyf.values[curveIndex] = (minY*d + (cvs.height-event.clientY+position.top))/d;
		}
	},

	setPos : function (x, y) {
		var t = this;
		var position = t.parentDiv.getBoundingClientRect();

		t.x = x;
		t.y = y;

		t.div.style.height = t.div.clientWidth+"px";
		t.div.style.left = (x-t.div.clientWidth/2)+"px";
		t.div.style.top = (position.top+((cvs.height-y)-t.div.clientHeight/2))+"px";
/*
		dirty = true;
		var picked = t.keyf;
		var d = cvs.height/ny;
		picked.values[curveIndex] = (cvs.height+minY*d-mouse.pos[1])/d;*/
	},

	
	pick : function(x, y) {
		var t = this;
		return Math.sqrt((x-t.x)*(x-t.x)+(y-t.y)*(y-t.y))-t.radius*2.0;
	},

	drawCircle : function(ctx, rad) {
		var t = this;
		ctx.beginPath();
		ctx.arc(t.x, t.y, rad, 0, 2 * Math.PI, false);
		ctx.fill();
	},

	drawSquare : function(ctx, rad) {
		var t = this;
	},

	draw : function(ctx) {
/*		var t = this;
		var rad = t.radius;
		
		ctx.fillStyle = t.color;
			
		if (t.type === "circle")
			return t.drawCircle(ctx, rad);
		if (t.type === "square")
			return t.drawSquare(ctx, rad);*/
	}
}
