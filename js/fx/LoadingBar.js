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


/**
 * @constructor
 */
function  LoadingBar() {
	var t = this;
}

LoadingBar.prototype = {
	preloadResources : function() {
	},

	exit : function() {
		var t = this;
		engine.text2d.hijacked = false;
		engine.removeCanvasClient(engine.frontCanvas, "LoadingBar exit");
		engine.clearAllContexts();
	},

	enter : function() {
		var t = this;
		engine.addCanvasClient(engine.frontCanvas, "LoadingBar enter");
		engine.clearAllContexts();
		engine.text2d.hijacked = true;
	},
	

	tick : function(time, _gl, remainingTime) {
		var t = this;
		t.elapsed += engine.deltaTime;
		
		// progress bar
		var cvs = engine.frontCanvas;
		var w = cvs.width;
		var h = cvs.height;
		var ctx = engine.frontContext;
		ctx.globalAlpha = 1.0;
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, w, h);
		ctx.fillStyle = "#888888";
		ctx.strokeStyle = "#FFFFFF";
		var offsetx = 0.006;
		var offsety = offsetx*w/h;
		var width = 0.5;
		var height = 0.05;
		ctx.strokeRect(w*(0.5-width*0.5-offsetx), h*(0.5-offsety), w*(width+offsetx*2.0), h*(height+offsety*2.0));
		ctx.fillRect(w * (0.5 - width * 0.5), h * 0.5, w * resman.loadingRatio * width, h * height);
	},

	createFX : function(_gl, hideText) {
	}
}
