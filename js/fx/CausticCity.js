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

function CausticCity(params) {
    var t = this;
    t.params = params;
    t.hlp = new RaymarchFXHelper();
    t.hlp.construct({
        name: "CausticCity", // for editing + used to load the .json param file (here: "CausticCity.json")
        parent: t,
        fragmentShadersPasses: [
           {
                id : "prepass",
                shader : ["fx/CausticCity.fs", "engine/raymarcher2_prepass.fs"],
                inputs : null,
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width : window.innerWidth, 
                    height: window.innerHeight, 
                    magFilter: engine.gl.NEAREST, // don´t interpolate those values!
                    minFilter: engine.gl.NEAREST,
                    type: engine.gl.FLOAT
                }
            },
            {
                id : "final",
                shader: ["fx/CausticCity.fs", "engine/raymarcher2_postpass.fs"],
                inputs : [{id : "prepass", sampler : 1}],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "godRays",
                disableRaymarch : true,
                shader: "engine/ZGodRays.fs",
                inputs: [{ id: "final", sampler: 0 }, { id: "prepass", sampler: 2 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "horizBlur",
                disableRaymarch: true,
                shader: "engine/HorizBlur.fs",
                inputs: [{ id: "prepass", sampler: 0 }, { id: "godRays", sampler: 1 }],
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
            }
	    ]
	});
	t.interpParams = [];
	t.textures = [];
	t.textureParams = [];
	t.allParams = {};
	t.lightPos = [1.0, 0.0, 0.0];
	t.godRayLight= [0.0, 0.0];

	// Camera
	t.prevCam = [0.0, 0.0, 0.0];

	t.direction = 0;
	t.texindex = 0;
	t.DOF = 0.05;
	t.timeAtEnter = -1.0;

	t.logo = document.getElementById('nautile_logo');
}

CausticCity.prototype = {

	loadTextures : function(_reload) {
		var t = this;
		engine.pushContext(webgl_2d_raymarch, "CausticCity preloadResources");
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
		engine.pushContext(webgl_2d_raymarch, "CausticCity enter");
		    var prg = t.hlp.getFragmentShaderPass("final").program;
		    prg.texratio = engine.gl.getUniformLocation(prg, "texratio");
		    prg.lightPosNormalized = engine.gl.getUniformLocation(prg, "lightPosNormalized");
		    prg.lightPos = engine.gl.getUniformLocation(prg, "lightPos");
		    prg.cityLights = engine.gl.getUniformLocation(prg, "cityLights");
		    

		    prg = t.hlp.getFragmentShaderPass("prepass").program;
		    prg.texratio = engine.gl.getUniformLocation(prg, "texratio");
		    prg.lightPos = engine.gl.getUniformLocation(prg, "lightPos");
		    prg.lightPosNormalized = engine.gl.getUniformLocation(prg, "lightPosNormalized");

		    prg = t.hlp.getFragmentShaderPass("godRays").program;
		    prg.lightPos = engine.gl.getUniformLocation(prg, "lightPos");
		    prg.decay = engine.gl.getUniformLocation(prg, "decay");

		    prg = t.hlp.getFragmentShaderPass("horizBlur").program;
		    prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");

		    prg = t.hlp.getFragmentShaderPass("vertBlur").program;
		    prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");

        engine.popContext();
        t.parent.campos[2] = 0.0;
        t.zspd = 40.0;
        t.timeAtEnter = engine.time;
        var imgHeight = 300.0;
//        engine.text2d.addRectangle({ x: 0.0, y: 0.5 - (imgHeight * 0.4) / window.innerHeight, w: 1.0, h: imgHeight  / 1080, a: 0.0, done: false, img: t.logo, alpha: 0.0, fadeIn: { wait: 2.0, duration: 5.0 }, fadeOut: { wait: 0.0, duration: 5.0 } });

	},
	
	manualCamera : function() {
	    var t = this;
	    var suite = t.parent;
	    var time = engine.time - t.timeAtEnter;
	    suite.campos[0] = 400.0 * Math.sin(time*0.4);
	    suite.campos[1] = -80.0;//+5.0*Math.cos(time);
	    suite.campos[2] = t.prevCam[2] + t.zspd * engine.deltaTime;
	    suite.camYaw = 0.0;//0.012*(suite.campos[0] - t.prevCam[0]);
	    suite.camRoll = 0.0;//-0.012 * (suite.campos[0] - t.prevCam[0]);
	    suite.camPitch = 0.0;//1.09;
	    t.prevCam[0] = suite.campos[0];
	    t.prevCam[1] = suite.campos[1];
	    t.prevCam[2] = suite.campos[2];
	    if (t.prevCam[2] > 3400.0) {
	        if (t.prevCam[2] > 4500.0) {
	            if (t.prevCam[2] > 6000.0) {
	                t.zspd = Math.min(50.0, t.zspd + 0.05);
	            } else {
	                t.zspd = Math.max(20.0, t.zspd - 0.08);
	            }
            } else {
	            t.zspd = Math.min(100.0, t.zspd + 0.081);
	        }
	    }
//	    console.log(t.prevCam[2]);
	},

	executeRenderPass: function (_passName) {
	    var t = this;
	    if (!t.hlp.enter_tick(_passName))
	        return;

	    var gl = engine.gl;
	    var pass = t.hlp.getFragmentShaderPass(_passName);
	    var prg = pass.program;

	    engine.setTexture(t.textures[(t.texindex + 1) % 2], 2);
	    engine.setTexture(t.textures[(t.texindex + 2) % 2], 3);
	    if (_passName != "prepass")
	        engine.setTexture(t.textures[2], 0);
	    if (prg.sampler4Uniform)
	        engine.setTexture(t.textures[3], 4);
	    engine.gl.uniform1f(prg.texratio, t.texratio);
	    engine.gl.uniform1f(prg.cityLights, 1.0);
	    engine.gl.uniform3fv(prg.lightPosNormalized, t.lightPos);
	    if (prg.lightPos)
	        engine.gl.uniform2fv(prg.lightPos, [t.godRayLight[0], t.godRayLight[1]]);

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

	tick: function (time, _gl, remaining) {
	    var t = this;
	    var time = engine.time - t.timeAtEnter;
	    t.DOF = 0.07;//0.0222;//5+0.035*Math.abs(Math.sin(0.2 * time ));//+ 0.2 * Math.random()));

	    var suite = t.parent;
	    suite.postProcess = false;
	    t.texratio = Math.abs(Math.cos(time * 0.1));
	    var direction = Math.sign(t.texratio);
	    if (direction != t.direction && t.texratio < 0.5) {
	        t.direction = direction;
	        t.texindex = Math.floor(t.texindex + 1) % 2;
	    }

	    t.godRayLight[0] = Math.cos(time * 0.6) * 0.5 - 0.5;
	    t.godRayLight[1] = Math.sin(time * 0.5) * 0.5 - 0.5;

	    t.lightPos[0] = Math.cos(time);
	    t.lightPos[1] = Math.sin(time);
	    t.lightPos[2] = Math.cos(time * 0.3) + Math.sin(time * 0.4);

	    var len = Math.sqrt(t.lightPos[0] * t.lightPos[0] + t.lightPos[1] * t.lightPos[1] + t.lightPos[2] * t.lightPos[2]);
	    t.lightPos[0] /= len;
	    t.lightPos[1] /= len;
	    t.lightPos[2] /= len;


	    t.executeRenderPass("prepass");
	    t.executeRenderPass("final");
	    t.executePostProcessPass("godRays");
	    t.executePostProcessPass("horizBlur");
	    t.executePostProcessPass("vertBlur");

	    return true;
	},


	createFX : function() {
		var t = this;
		t.hlp.createFX();
	}
}
