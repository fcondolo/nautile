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
function  Forest(params) {
	var t = this;
	t.params = params;
	t.hlp = new RaymarchFXHelper();
	t.hlp.construct({
	    name: "RmForest",
	    fragmentShadersPasses: ["fx/Forest.fs"],
	    parent: t,
	    prevFramesCount: 4
	});
	t.interpParams = [];
	t.textures = [];
	t.textureParams = [];
	t.allParams = {};
	t.prevCam = [0.0,0.0,0.0,0.0,0.0,0.0];
}

Forest.prototype = {

	loadTextures : function(_reload) {
		var t = this;
		engine.pushContext(webgl_2d_raymarch, "Forest preloadResources");
			for (var i = 0; i < t.textureParams.length; i++)
				t.textures[i] = resman.prefetchTexture(t.textureParams[i].file);
		engine.popContext();
	},
	
	preloadResources : function() {
		var t = this;
		t.hlp.preloadResources();
		t.loadTextures(false);
	},

	exit : function() {
		var t = this;
		t.hlp.exit();
		for (var i = 0; i < t.textures.length; i++)
		    t.textures[i].release();
	},

	enter : function() {
		var t = this;
		t.hlp.enter();
		var suite = t.parent;
	},
	
	manualCamera : function() {
		var t = this;
		var suite = t.parent;

		var xmovePeriod = engine.time*0.4;
		var destPos = [];
		var destRot = [];
		destPos[0] = 5.0*Math.cos(xmovePeriod); // suite.campos[0]
		destRot[0] = -0.4*Math.sin(xmovePeriod); // suite.camYaw
		
		destPos[1] = 1.0;//+0.5*Math.sin(xmovePeriod);
		destPos[2] = 1.5*engine.time;
		destRot[1] = -0.02*(suite.campos[0]-t.prevCam[0]); // suite.camRoll
		destRot[2] = 0.01*(suite.campos[1]-t.prevCam[1]); // suite.camPitch
		
		suite.campos[0] = destPos[0];//t.prevCam[0] + (destPos[0] - t.prevCam[0]) * engine.deltaTime;
		suite.campos[1] = destPos[1];//t.prevCam[1] + (destPos[1] - t.prevCam[1]) * engine.deltaTime;
		suite.campos[2] = destPos[2];//t.prevCam[2] + (destPos[2] - t.prevCam[2]) * engine.deltaTime;
		suite.camYaw = destRot[0];//suite.camYaw + (destRot[0] - suite.camYaw) * engine.deltaTime;
		suite.camRoll = destRot[1];//suite.camRoll + (destRot[1] - suite.camRoll) * engine.deltaTime;
		suite.camPitch = destRot[2];//suite.camPitch + (destRot[2] - suite.camPitch) * engine.deltaTime;
		t.prevCam = [suite.campos[0],suite.campos[1],suite.campos[2],suite.camYaw,suite.camRoll,suite.camPitch];
	},
	
	
	tick : function(time, _gl, remaining) {
		var t = this;
		if (!t.hlp.enter_tick())
			return false;
/*
			if (t.hlp.isCurrent) {
			t.parent.camSpd[0] += (1.0 - t.parent.camSpd[0]) * 0.1;
			t.parent.camSpd[1] += (0.0 - t.parent.camSpd[1]) * 0.1;
			t.parent.camSpd[2] += (1.0 - t.parent.camSpd[2]) * 0.1;
			t.parent.camBaseY  += (4.0 - t.parent.camBaseY) * 0.1;
		}
	*/	
		var gl = engine.gl;
		engine.setTexture(t.textures[0], 1); // texture 0 reserved for mask
		engine.setTexture(t.textures[1], 2);
		engine.setTexture(t.textures[2], 6);
		t.hlp.exit_tick();

		return true;
	},


	createFX : function() {
		var t = this;
		t.hlp.createFX();
	}
}
