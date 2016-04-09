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
function  SeaTrees(params) {
	var t = this;
	t.params = params;
	t.hlp = new RaymarchFXHelper();
	t.hlp.construct({
	    name: "RmSeaTrees",
	    parent: t,
	    prevFramesCount: 2,
	    fragmentShadersPasses: [
           {
               id: "onepass",
               shader: "fx/SeaTrees.fs",
               inputs: null,
               outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                   width: window.innerWidth,
                   height: window.innerHeight,
                   magFilter: engine.gl.NEAREST, // don´t interpolate those values!
                   minFilter: engine.gl.NEAREST,
                   type: engine.gl.FLOAT
               }
           },
            {
                id: "godRays",
                disableRaymarch: true,
                shader: "engine/GodRays.fs",
                inputs: [{ id: "onepass", sampler: 0 }],
                outputTex: null
            }
           /*
           {
               id: "prepass",
               shader: ["fx/SeaTrees.fs", "engine/raymarcher2_prepass.fs"],
               inputs: null,
               outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                   width: window.innerWidth,
                   height: window.innerHeight,
                   magFilter: engine.gl.NEAREST, // don´t interpolate those values!
                   minFilter: engine.gl.NEAREST,
                   type: engine.gl.FLOAT
               }
           },
            {
                id: "final",
                shader: ["fx/SeaTrees.fs", "engine/raymarcher2_postpass.fs"],
                inputs: [{ id: "prepass", sampler: 1 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "horizBlur",
                disableRaymarch: true,
                shader: "engine/HorizBlur.fs",
                inputs: [{ id: "prepass", sampler: 0 }, { id: "final", sampler: 1 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "vertBlur",
                disableRaymarch: true,
                shader: "engine/VertBlur.fs",
                inputs: [{ id: "prepass", sampler: 0 }, { id: "horizBlur", sampler: 1 }],
                outputTex: null
            }*/
	    ]
	});
	t.interpParams = [];
	t.textures = [];
	t.textureParams = [];
	t.allParams = {};
	t.DOF = 2.9;
	t.godRayLight= [0.0, 0.0];
	t.lightPos = [1.0, 0.0, 0.0];
	t.cubeFactor = 0.0;
	t.baseEcart = 30.0;
	t.lightPlane = 2.5;
	t.exitRectDone = false;
	t.beatCounter = 0;
	t.applyBeat = false;
	t.applyBeat2 = false;
	t.addRot = 0.0;
	t.addY = 0.0;
	t.creaturePos = [0.0, 0.0, 0.0];
	t.destAngles = [0.0, -3.14 * 0.5, -3.14, 3.14 * 0.5, 0.0, -3.14 * 0.15, -3.14, -3.14, -3.14];
	t.destAngleStart = [0.0, -3.14 * 0.5, -3.14, 3.14 * 0.5, 0.0, -3.14 * 0.15, -3.14, -3.14, -3.14];
	t.destDeltaX = [0.0, 8.0, 0.0, -8.0, 0.0, 8.0, 0.0, -8.0, 0.0];
	t.destDeltaY = [0.0, -2.5, 0.0, -2.5, 0.0, -2.5, 0.0, -2.5, 0.0];
	t.destDeltaZ = [10.0, 20.0, 35.5, 16.0, 10.0, 20.0, 35.5, 16.0, 10.0];
	t.nextDestAngleIndex = -1;

	// Camera
	t.prevCam = [0.0,0.0,0.0];
}

SeaTrees.prototype = {

	loadTextures : function(_reload) {
		var t = this;
		engine.pushContext(webgl_2d_raymarch, "RMSea preloadResources");
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
		engine.pushContext(webgl_2d_raymarch, "Seatrees exit");
			for (var i = 0; i < t.textures.length; i++)
			    t.textures[i].release();
		engine.popContext();
		if (!t.exitRectDone) { // safe fallback for slow machines
		    engine.addCanvasClient(engine.frontCanvas, "Seatrees.exit");
		    t.exitRectDone = true;
		    engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#FFFFFF", alpha: 1.0, fadeIn: { wait: 0.0, duration: 0.5 }, fadeOut: { wait: 0.0, duration: 1.5 } });
		    engine.text2d.closeAllIn(1.5);
		}
	},

	enter : function() {
		var t = this;
		t.hlp.enter();
		t.exitRectDone = false;
		engine.pushContext(webgl_2d_raymarch, "SeaTrees enter");
		
		    var prg = t.hlp.getFragmentShaderPass("godRays").program;
		    prg.lightPos = engine.gl.getUniformLocation(prg, "lightPos");
		    prg.decay = engine.gl.getUniformLocation(prg, "decay");

		    prg = t.hlp.getFragmentShaderPass("onepass").program;
		    prg.lightPos = engine.gl.getUniformLocation(prg, "lightPos");
		    prg.cubeFactor = engine.gl.getUniformLocation(prg, "cubeFactor");
		    prg.baseEcart = engine.gl.getUniformLocation(prg, "baseEcart");
		    prg.lightPlane = engine.gl.getUniformLocation(prg, "lightPlane");
		    prg.creaturePos = engine.gl.getUniformLocation(prg, "creaturePos");
		    

	    /*
		    prg = t.hlp.getFragmentShaderPass("horizBlur").program;
		    prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");

		    prg = t.hlp.getFragmentShaderPass("vertBlur").program;
		    prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");
            */
		engine.popContext();

		engine.addCanvasClient(engine.frontCanvas, "SeaTrees.enter");
		engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 1.5 } });
		engine.text2d.closeAllIn(2.0);
		t.timeAtStart = engine.time;
		var suite = t.parent;
		suite.camYaw = 0.0;
	},
	
	manualCamera: function () {
		var t = this;
		var time = engine.time - t.timeAtStart;
		var suite = t.parent;
		var y = 2.0*Math.cos(time); // FROM SHADER (CREATURE Y TOWARDS)
		var desty = 0.5*y+8.0;
		var xmovePeriod = time*0.45;
		suite.campos[0] = 10.0*Math.cos(xmovePeriod);

		suite.camYaw += t.addRot;
		suite.campos[1] = desty;
		suite.campos[2] = 10.5 * time;
		var targetRoll = suite.campos[0] * 0.03;
		suite.camRoll = targetRoll;
		suite.camPitch = suite.campos[0] * 0.05;
		t.prevCam[0] = suite.campos[0];
//		suite.camRoll = 0.0;
//		suite.camPitch = 0.0;
//		suite.camYaw = 0.0;
	},
	
	executeRenderPass: function (_passName) {
	    var t = this;
	    if (!t.hlp.enter_tick(_passName))
	        return;

	    var time = engine.time - t.timeAtStart;

	    var gl = engine.gl;
	    var pass = t.hlp.getFragmentShaderPass(_passName);
	    var prg = pass.program;

	    engine.setTexture(t.textures[0], 5);
	    engine.setTexture(t.textures[1], 4);
	    engine.setTexture(t.textures[2], 6);

	    if (prg.lightPos)
	        engine.gl.uniform2fv(prg.lightPos, [t.godRayLight[0], t.godRayLight[1]]);

	    if (prg.cubeFactor)
	        engine.gl.uniform1f(prg.cubeFactor, t.cubeFactor);

	    if (prg.baseEcart)
	        engine.gl.uniform1f(prg.baseEcart, t.baseEcart);

	    if (prg.lightPlane)
	        engine.gl.uniform1f(prg.lightPlane, t.lightPlane);

	    if (prg.creaturePos)
	        engine.gl.uniform3fv(prg.creaturePos, t.creaturePos);

	    t.hlp.exit_tick(_passName);
	},

	executePostProcessPass: function (_passName) {
	    var t = this;
	    if (!t.hlp.enter_tick(_passName))
	        return;

	    engine.setTexture(t.textures[4], 1);

	    var prg = t.hlp.getFragmentShaderPass(_passName).program;
	    if (prg.sensitivity)
	        engine.gl.uniform1f(prg.sensitivity, t.DOF);

	    if (prg.lightPos)
	        engine.gl.uniform2fv(prg.lightPos, [t.godRayLight[0], t.godRayLight[1]]);
	    if (prg.decay)
	        engine.gl.uniform1f(prg.decay, 0.96815);

	    t.hlp.exit_tick(_passName);
	},


	tick : function(time, _gl, remaining) {
		var t = this;
		var time = engine.time - t.timeAtStart;
		var suite = t.parent;

		t.baseEcart = 30.0;
		t.lightPlane = 2.5;
		t.cubeFactor = 0.0;
		if (beatHandler.beatOccuredThisFrame) {
		    t.beatCounter++;
		    if (t.beatCounter > 1) {
		        t.beatCounter = 0;
		        t.applyBeat = true;
		    } else {
		        t.applyBeat2 = true;
		        t.nextDestAngleIndex++;
		    }
		}
		if (t.applyBeat) {
		    t.cubeFactor = beatHandler.beatBarFader;
		    if (t.cubeFactor < 0.1)
		        t.applyBeat = false;
		}
		if (t.applyBeat2) {
		    var spd = 4.15;
		    t.addRot = (t.destAngles[t.nextDestAngleIndex % t.destAngles.length] - suite.camYaw) * engine.deltaTime * spd;
		    t.addY = (t.destDeltaY[t.nextDestAngleIndex % t.destAngles.length] - t.creaturePos[1]) * engine.deltaTime * spd;
		    t.creaturePos[0] += (t.destDeltaX[t.nextDestAngleIndex % t.destAngles.length] - t.creaturePos[0]) * engine.deltaTime * spd;
		    t.creaturePos[2] += (t.destDeltaZ[t.nextDestAngleIndex % t.destAngles.length] - t.creaturePos[2]) * engine.deltaTime * spd;
		    t.creaturePos[1] += t.addY;
		    if (Math.abs(t.addRot) < 0.001) {
		        t.applyBeat2 = false;
		        suite.camYaw = t.destAngleStart[t.nextDestAngleIndex];
		        t.addRot = 0.0;
            }
		} else
		    t.creaturePos[2] += -engine.deltaTime * 4.0;

		if (remaining < 5.0) {
		    if (remaining <= 0.5 && !t.exitRectDone) {
		        engine.addCanvasClient(engine.frontCanvas, "Seatrees.tick");
		        t.exitRectDone = true;
		        engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#FFFFFF", alpha: 1.0, fadeIn: { wait: 0.0, duration: 0.5 }, fadeOut: { wait: 0.0, duration: 1.5 } });
		        engine.text2d.closeAllIn(2.0);
            }
		//    t.baseEcart -= Math.max(3.0, 0.5 * (10.0 - remaining));
		 //   t.lightPlane = Math.min(10.0, 1.0 + (10.0 - remaining));
		    t.cubeFactor = Math.max(t.cubeFactor, Math.min(Math.max(0.0, (5.0 - remaining)/5.0), 1.0));
		}

		t.godRayLight[0] = Math.cos(time * 0.6) * 0.25 - 0.5;
		t.godRayLight[1] = Math.sin(time * 0.5) * 0.25 - 0.5;
		t.executeRenderPass("onepass");
		t.executePostProcessPass("godRays");

	    /*		t.executeRenderPass("prepass");
		t.executeRenderPass("final");
		t.executePostProcessPass("horizBlur");
		t.executePostProcessPass("vertBlur");
        */
	/*	t.parent.glowColorSub[0] = 0.35;
		t.parent.glowColorSub[1] = 0.45;
		t.parent.glowColorSub[2] = 1.0;
        */
		return true;
	},


	createFX : function() {
		var t = this;
		t.hlp.createFX();
	}
}
