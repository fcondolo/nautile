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
function  RaymarchFxSuite(_param, _useDefaultGlow) {
	var t = this;
	t.useDefaultGlow = _useDefaultGlow;
	t.singleParam = _param;

	if (t.useDefaultGlow) {
	    t.shadersPath = "shaders/";
	    engine.pushContext(webgl_2d_raymarch, "RaymarchFxSuite Constructor");
	        t.vertexShader = [t.shadersPath + "engine/vertex.vs"];				// Default vertex transfo for raymarch fullscreen triangles
	        t.fragmentShader = [t.shadersPath + "engine/RaymarchFxSuite.fs"];	// Shader to combine output textures of current and next FX
	        t.glowPass1Shader = [t.shadersPath + "engine/GlowPass1.fs"];
	        t.glowPass2Shader = [t.shadersPath + "engine/GlowPass2.fs"];
	        t.BlurPassShader = [t.shadersPath + "engine/BlurPass.fs"];
	        t.quad = new QuadMesh();
	    engine.popContext();
	}

	t.isSuite = true;
	t.lst = []; 					// fill the list later, when we are sure all FX .js are loaded
	t.campos = [0.0, 2.0, 0.0];		// current position of the camera
	t.camtgt = [0.0, 2.0, 0.0];		// target position for the camera
	t.camtgtReachSpd = 0.14;			// delay in seconds for camera to reach its target (if target is not moving)
	t.camRoll = 0.0;
	t.camPitch = 0.0;
	t.camYaw = 0.0;
	t.camSpd = [];
	t.camRotSpd = [];
	t.lastCurFxIndex = 0;
	t.maxSimultaneousFX = 2;		// changing this value means changing the code of the fragment shader
	t.fogfar = 100.0;
	t.postProcess = true;
	t.gaussTable = new Array();
	t.gaussTable[0] = -3.0;
	t.gaussTable[1] = 0.015625;
	t.gaussTable[2] = -2.0;
	t.gaussTable[3] = 0.09375;
	t.gaussTable[4] = -1.0;
	t.gaussTable[5] = 0.234375;
	t.gaussTable[6] = 0.0;
	t.gaussTable[7] = 0.3125;
	t.gaussTable[8] = 1.0;
	t.gaussTable[9] = 0.234375;
	t.gaussTable[10] = 2.0;
	t.gaussTable[11] = 0.09375;
	t.gaussTable[12] = 3.0;
	t.gaussTable[13] = 0.015625;
	t.glowRenderTexSize = [Math.floor(window.innerWidth)/4, Math.floor(window.innerHeight)/4, 1];
	t.glowAmount = [1.0, 1.0, 1.0];
	t.glowColorSub = [0.5, 0.5, 0.5, 0.0];
	t.blurScale = [2.0, 2.0];
	t.lastFXEndCam = [0.0,0.0,0.0,0.0,0.0,0.0];
	t.camTransitionTimer = -1.0;
	t.camTransitionDuration  = 10.0;
	t.justSwitchedFX = true;
}

RaymarchFxSuite.prototype = {
	
    /*
		preloadResources is called when all code is loaded and before resources are loaded.
		For this reason, it's the right place to reference other .js
	*/
    preloadResources : function() { 
        var t = this;
		
        if (t.useDefaultGlow) {
            engine.pushContext(webgl_2d_raymarch, "RaymarchFxSuite preloadResources");
                t.shaders = resman.prefetchShaderFiles(t.vertexShader, t.fragmentShader);
                t.glowPass1 = resman.prefetchShaderFiles(t.vertexShader, t.glowPass1Shader);
                t.glowPass2 = resman.prefetchShaderFiles(t.vertexShader, t.glowPass2Shader);
                t.blurPass = resman.prefetchShaderFiles(t.vertexShader, t.BlurPassShader);
                engine.popContext();
        }

        eval(t.singleParam);

        var curDepth = 0.0;
        var prevfx = null;
        if (t.lst.length == 1) {
            prevfx = t.lst[0].fx;
        } else {
            prevfx = t.lst[t.lst.length-1].fx;
        }
        for (var i = 0; i < t.lst.length; i++) {
            var fx = t.lst[i].fx;
            fx.depth = t.lst[i].depth;
            fx.parent = t;
            fx.preloadResources();
            fx.startZ = curDepth;
            curDepth += fx.depth;
            fx.endZ = curDepth;
            fx.prev = prevfx;
            prevfx = fx;
        }
    },
		
    exit : function() {
        var t = this;
        engine.removeCanvasClient(engine.canvases[webgl_2d_raymarch], "RaymarchFxSuite");
        for (var i = 0; i < t.lst.length; i++) 
            t.lst[i].fx.exit();			
    },

    enter : function() {
        var t = this;
        t.elapsed = 0.0;
        engine.addCanvasClient(engine.canvases[webgl_2d_raymarch], "RaymarchFxSuite");
        for (var i = 0; i < t.lst.length; i++) 
            t.lst[i].fx.enter();
			
        t.campos[0] = 0.0;
        t.campos[1] = 0.0;
        t.campos[2] = 0.0;
		
        if (t.lst.length > 1)
            t.campos[2] %= t.lst[t.lst.length-1].fx.endZ;
			
        t.camSpd = [0.9, 0.6, 4.0];
        t.camRotSpd = [0.5, 0.5, 0.0];
        t.camRotAmpl = [0.25, 0.7, 0.0];
        t.camXYMoveAmpl = [2.0, 3.0];
        t.camElapsed = [0.0, 0.0, 0.0];
        t.camRotElapsed = [0.0, 0.0, 0.0];
        t.camBaseY = 4.5;
    },

    updateCurFxIndex : function(time, _gl, remaining) {
        var t = this;
        //		console.log("updateCurFxIndex: cam Z=" + t.campos[2]);
        for (var i = 0; i < t.lst.length; i++) {
            var index = (t.lastCurFxIndex + i) % t.lst.length;
            //			console.log("fx index:" + index + " (" + t.lst[index].fx.hlp.name + ") " + "strt:" + t.lst[index].fx.startZ + ", end:" + t.lst[index].fx.endZ);
            if (t.campos[2] >= t.lst[index].fx.startZ && t.campos[2] <= t.lst[index].fx.endZ) {
                if (t.lastCurFxIndex != index) { // new FX?
                    var nextfx = t.lst[index].fx;
                    t.fogfar = t.lst[index].depth;
                    t.lastFXEndCam = [t.campos[0], t.campos[1], t.campos[2], t.camRoll, t.camPitch, t.camYaw];
                    nextfx.prevCam = [t.campos[0], t.campos[1], t.campos[2]];
                    t.camTransitionTimer = t.camTransitionDuration;
                    t.justSwitchedFX = true;
                    console.log("RAYMARCH FX SUITE NEXT FX");
                }
                t.lastCurFxIndex = index;
                break;
            }
        }
        return t.lastCurFxIndex;
    },
	
    tick: function (time, _gl, remaining) {
        var t = this;
        var dt = engine.deltaTime;
        t.elapsed += dt;
		
        // render FX
        t.lst[0].fx.tick(time, _gl, remaining);
			

        if (t.useDefaultGlow) {
            var tex0 = t.lst[0].fx.hlp.lastoutputTex;
            engine.pushContext(webgl_2d_raymarch, "RaymarchFxSuite tick");
                var gl = engine.gl;
                engine.useProgram(t.program);
                engine.useProgram(t.glowprogram1);
                engine.setTexture(tex0, 0);
                gl.uniform3fv(t.glowprogram1.iResolution, t.glowRenderTexSize);
                gl.uniform2fv(t.glowprogram1.gaussFilter, t.gaussTable);
                gl.uniform4fv(t.glowprogram1.colorSub, t.glowColorSub);
                engine.enterRenderTexture(t.postProcessRenderTex);
                t.quad.draw(gl, t.glowprogram1);
                engine.exitRenderTexture(t.postProcessRenderTex);

                engine.useProgram(t.blurProgram);
                engine.setTexture(t.postProcessRenderTex, 0);
                gl.uniform3fv(t.blurProgram.iResolution, t.glowRenderTexSize);
                gl.uniform2fv(t.blurProgram.gaussFilter, t.gaussTable);
                gl.uniform2fv(t.blurProgram.blurScale, t.blurScale);					
                engine.enterRenderTexture(t.postProcessRenderTex2);
                t.quad.draw(gl, t.blurProgram);
                engine.exitRenderTexture(t.postProcessRenderTex2);
					
                engine.useProgram(t.glowprogram2);
                gl.uniform3fv(t.glowprogram2.glowAmount, t.glowAmount);
                engine.setTexture(tex0, 0);
                engine.setTexture(t.postProcessRenderTex2, 1);
                t.quad.draw(gl, t.glowprogram2);
            engine.popContext();
        }
			
   //     console.log("CAM:" + t.campos[0] + ", "+t.campos[1]+", "+t.campos[2]+", "+t.camRoll+", "+t.camPitch+", "+t.camYaw)
        t.justSwitchedFX = false;
    },


	createFX : function(_gl, hideText) {
	    var t = this;

	    if (t.useDefaultGlow) {
	        engine.pushContext(webgl_2d_raymarch, "RaymarchFxSuite createFX");
	            var gl = engine.gl;

	            t.program = engine.createProgramFromPrefetch(t.shaders, t.name + "RaymarchFxSuite");
	            t.glowprogram1 = engine.createProgramFromPrefetch(t.glowPass1, "RaymarchFxSuite_glowPass1");
	            t.glowprogram1.colorSub = gl.getUniformLocation(t.glowprogram1, "colorSub");
	            t.glowprogram1.gaussFilter = gl.getUniformLocation(t.glowprogram1, "gaussFilter");
	            t.glowprogram2 = engine.createProgramFromPrefetch(t.glowPass2, "RaymarchFxSuite_glowPass2");
	            t.glowprogram2.glowAmount = gl.getUniformLocation(t.glowprogram2, "glowAmount");
	            t.blurProgram = engine.createProgramFromPrefetch(t.blurPass, "RaymarchFxSuite_blurPass");
	            t.blurProgram.gaussFilter = gl.getUniformLocation(t.blurProgram, "gaussFilter");
	            t.blurProgram.blurScale = gl.getUniformLocation(t.blurProgram, "blurScale");
	            t.quad.create(gl, -1.0, -1.0, 2.0, 2.0);

	            t.postProcessRenderTex = new Texture();
	            t.postProcessRenderTex.createRenderTexture(gl, t.glowRenderTexSize[0], t.glowRenderTexSize[1], { wrap: engine.gl.CLAMP_TO_EDGE });
	            t.postProcessRenderTex2 = new Texture();
	            t.postProcessRenderTex2.createRenderTexture(gl, t.glowRenderTexSize[0], t.glowRenderTexSize[1], { wrap: engine.gl.CLAMP_TO_EDGE });

	        engine.popContext();
	    }

		t.lst[0].fx.createFX(_gl, hideText, false, false);
	}
}


