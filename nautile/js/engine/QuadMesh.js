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
function QuadMesh() {
	var t = this;	
	t.transfo = {x:0.0, y:0.0, rot:0.0};
	t.scale = {x:1.0, y:1.0};
}

QuadMesh.prototype = {
	create : function(gl,x,y,width,height, u0, v0, uSize, vSize) {
		var t = this;
		u0 = u0 || 0.0;
		v0 = v0 || 0.0;
		uSize = uSize || 1.0;
		vSize = vSize || 1.0;
		var u1 = u0 + uSize;
		var v1 = v0 + vSize;
		
		t.vertices = new Float32Array([
			x, y, u0, v0, 	// x2d, y2d, u, v
			x+width, y, u1, v0,
			x+width, y+height, u1, v1,
			x, y, u0, v0,
			x+width, y+height, u1, v1,
			x,y+height, u0, v1
			]);
		
		t.itemSize = 4;	// number of floats that compose 1 vertex
		t.vbuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, t.vbuffer);					
		gl.bufferData(gl.ARRAY_BUFFER, t.vertices, gl.STATIC_DRAW);
		t.numItems = t.vertices.length / t.itemSize;
		},
	
	update : function(gl,x,y,width,height, u0, v0, uSize, vSize) {
		var t = this;
		u0 = u0 || 0.0;
		v0 = v0 || 0.0;
		uSize = uSize || 1.0;
		vSize = vSize || 1.0;
		var u1 = u0 + uSize;
		var v1 = v0 + vSize;
		
		t.vertices = new Float32Array([
			x, y, u0, v0, 	// x2d, y2d, u, v
			x+width, y, u1, v0,
			x+width, y+height, u1, v1,
			x, y, u0, v0,
			x+width, y+height, u1, v1,
			x,y+height, u0, v1
			]);
		
		gl.bindBuffer(gl.ARRAY_BUFFER, t.vbuffer);					
		gl.bufferData(gl.ARRAY_BUFFER, t.vertices, gl.STATIC_DRAW);
		},

	draw : function(gl, program) {
		var t = this;
		gl.bindBuffer(gl.ARRAY_BUFFER, t.vbuffer);					
		gl.enableVertexAttribArray(program.vertexData);
		gl.vertexAttribPointer(program.vertexData, t.itemSize, gl.FLOAT, false, 0, 0);

		gl.enableVertexAttribArray(program.vertexData);
		gl.vertexAttribPointer(program.vertexData, t.itemSize, gl.FLOAT, false, 0, 0);
		if (program.transfo2D)
			gl.uniform3fv(program.transfo2D, [t.transfo.x, t.transfo.y, t.transfo.rot]);
		if (program.scale2D)
			gl.uniform2fv(program.scale2D, [t.scale.x, t.scale.y]);
		gl.drawArrays(gl.TRIANGLES, 0, t.numItems);	
	}
}