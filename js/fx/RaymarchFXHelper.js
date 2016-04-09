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
 
function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function  RaymarchFXHelper() {
	var t = this;
	t.lastCamZ = 0.0;
	t.isCurrent = false;
	t.renderTexAllocated = false;
	t.curSettingIndex = 0;
}

RaymarchFXHelper.prototype = {
	
    construct : function(params) {
        var t = this;
        if (!params || !params.parent || !params.name)
            engine.error("RaymarchFXHelper::construct malformed params");
		t.parent = params.parent;
		t.name = params.name;
		t.additionalPassesCount = 0;
		if (params.prevFramesCount)
		    t.prevFramesCount = params.prevFramesCount;
        else
		    t.prevFramesCount = 1;

        engine.pushContext(webgl_2d_raymarch, t.name + "constructor");

		t.texturesPath = "data/";
		t.shadersPath = "shaders/";
		if (params.customVS)
		    t.vertexShader = [t.shadersPath + params.customVS];
		else
		    t.vertexShader = [t.shadersPath + "engine/vertex.vs"];
		
		t.fragmentShaderPasses = [];

		if (params.customFS) {
		    t.fragmentShaderPasses[0] = {
		        id : "final",
                shader : params.customFS,
		        inputs : null,
		        outputTex : null
		    }		   
		} else {
		    if (params.fragmentShadersPasses) {
		        t.fragmentShaderPasses = params.fragmentShadersPasses;
		        t.additionalPassesCount = params.fragmentShadersPasses.length - 1;
		        for (var iPass = 0; iPass < params.fragmentShadersPasses.length; iPass++) {
		            var thisPass = t.fragmentShaderPasses[iPass];
		            var additionalShader = "";
		            var shaderHeader = [];
		            if (!thisPass.disableRaymarch) {
		                additionalShader = "engine/raymarcher2.fs";
		                shaderHeader.push(t.shadersPath + "engine/raymarcher_2_header.fs");
		                shaderHeader.push(t.shadersPath + "engine/raymarcher_2_header_shapes.fs");
		                shaderHeader.push(t.shadersPath + "engine/raymarcher_2_header_transfo.fs");
		                shaderHeader.push(t.shadersPath + "engine/raymarcher_2_header_misc.fs");
		            }
		            var shaderVar = thisPass.shader;
		            if (thisPass.customFS)
		                shaderVar = thisPass.customFS;
		            if (Object.prototype.toString.call(shaderVar) === '[object Array]') {
		                for (var is = 0; is < shaderVar.length; is++)
		                    shaderHeader.push(t.shadersPath + shaderVar[is]);
		                if (additionalShader.length > 1)
		                    thisPass.shader = shaderHeader.concat([t.shadersPath + additionalShader]);
                        else
		                    thisPass.shader = shaderHeader;
                    } else {
		                if (additionalShader.length > 0)
    		                thisPass.shader = shaderHeader.concat([t.shadersPath + params.fragmentShadersPasses[iPass].shader, t.shadersPath + additionalShader]);
                        else
		                    thisPass.shader = shaderHeader.concat([t.shadersPath + params.fragmentShadersPasses[iPass].shader]);
                    }
		        }
		    }
		    else
		        t.fragmentShaderPasses[0] =  {
		            id : "final",
		            shader : shaderHeader.concat([t.shadersPath + "engine/raymarcher2.fs"]),
		            inputs : null,
		            outputTex : null
		        }
		}
		
		t.quad = new QuadMesh();

		for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++) {
		    t.fragmentShaderPasses[iPass].index = iPass;
		    if (params.fragmentShadersPasses)
		        t.fragmentShaderPasses[iPass].params = params.fragmentShadersPasses[iPass];
		    else
		        t.fragmentShaderPasses[iPass].params = {};
		}

		engine.popContext();
	},

	getCurrentSetting : function() {
		var t = this;
		return t.parent.allParams.settings[t.curSettingIndex].curves;
	},

	getCurveValues : function () {
		var t = this;
		if (t.interp.glowAmountIndex >= 0)
			t.glowAmount = t.interp.list[t.interp.glowAmountIndex].curve;
		else t.glowAmount = null;
		if (t.interp.glowColorSubIndex >= 0)
			t.glowColorSub = t.interp.list[t.interp.glowColorSubIndex].curve;
		else t.glowColorSub = null;
		if (t.interp.glowBlurScaleIndex >= 0)
			t.blurScale = t.interp.list[t.interp.glowBlurScaleIndex].curve;
		else t.blurScale = null;
		if (t.interp.camPosIndex >= 0)
		    t.camPos = t.interp.list[t.interp.camPosIndex].curve;
		else t.camPos = null;
		if (t.interp.camRotIndex >= 0)
		    t.camRot = t.interp.list[t.interp.camRotIndex].curve;
		else t.camRot = null;
	},
			
			
	findSetting : function(_name) {
		var t = this;
		var s = t.parent.allParams.settings;
		var l = s.length;
		for (var i = 0; i < l; i++) {
			if (s[i].Setting_Name === _name)
				return s[i];
		}
		return null;
	},
	
	findSettingIndex : function(_name) {
		var t = this;
		var s = t.parent.allParams.settings;
		var l = s.length;
		for (var i = 0; i < l; i++) {
			if (s[i].Setting_Name === _name)
				return i;
		}
		return -1;
	},
	
	
	onNewEditorSettings : function(_str) {
		var t = this;
		var p = t.parent;
		if (_str)
			eval("p.allParams ="+_str);
		p.sequenceParams = p.allParams.sequence;
		p.textureParams = p.allParams.textures;
		p.interpParams = t.getCurrentSetting();
		t.createInterpolators();
		for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++)
		    t.registerUniforms(iPass);
		if (engine.editor) engine.editor.enterNewFX(p, t.name, p.interpParams);
	},

	loadShaders : function(_reload) {
		var t = this;
		var isReload = false;
		if (_reload)
			isReload = true;
		engine.pushContext(webgl_2d_raymarch, t.name + "preloadresources");
		for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++)
		    t.fragmentShaderPasses[iPass].fullShaderText = resman.prefetchShaderFiles(t.vertexShader, t.fragmentShaderPasses[iPass].shader, isReload);
		engine.popContext();
		if (_reload) {
			t.parent.createFX(engine.gl, true, false, true);
			t.checkRenderTex();
		}
	},

	preloadResources : function() {
		var t = this;
		t.loadShaders();
		paramsLoader_get(t.name+".json", t);
	},
	
	mergeParams: function (listPerSetting, defaultList) {
	    var l0 = listPerSetting.length;
	    for (var curSetting = 0; curSetting < l0; curSetting++) {
	        var paramsList = listPerSetting[curSetting];
	        var l1 = paramsList.length;
			var l2 = defaultList.length;

			for (var curDefault = 0; curDefault < l2; curDefault++) {
			    var name = defaultList[curDefault].name;
				var found = false;
				for (var curParam = 0; curParam < l1; curParam++) {
				    if (paramsList[curParam].name === name) {
						found = true;
						break;
					}
				}
				if (!found) {
				    paramsList.push(defaultList[curDefault]);
				}
			}
		}
	},

	
	onParamLoaded : function(_url, _responseText) {
		var t = this;
		try {
			if (endsWith(_url, t.name+".json")) {
				eval("t.parent.allParams ="+_responseText);
				t.parent.sequenceParams = t.parent.allParams.sequence;
				t.parent.textureParams = t.parent.allParams.textures;
				t.parent.interpParams = t.getCurrentSetting();
			}
		} catch (e) {
			if (e instanceof SyntaxError)
				engine.error("Error reading params file:\n\"" + _url + "\"\n" + e.message + "\nLine: " + e.lineNumber + "\nColumn: " + e.columnNumber);
			else
				engine.error("Error reading params file:\n" + _url + "\n" + e.toString());
		}

		t.createInterpolators();
	},
	
	createInterpolators : function() {
		var t = this;
		t.interp = new InterpolatorList(t, t.parent.allParams.fields);
		t.interp.addInterpolatorLists();
		t.mergeParams(t.interp.listPerSetting, paramsLoader_Default);
		t.interp.update(engine.time); // important initial update to instantiate curves
	},

	exit : function() {
		var t = this;
		engine.removeCanvasClient(engine.canvases[webgl_2d_raymarch], "RaymarchFXHelper");
		engine.pushContext(webgl_2d_raymarch, t.name + "exit");
			if (t.renderTexAllocated) {
			    for (var i = 0; i < t.prevFramesCount; i++)
				    t.outputTex[i].release();
				for (var i = 0; i < t.additionalPassesCount; i++)
				    t.fragmentShaderPasses[i].renderTexture.release();
			}
		engine.popContext();
	},

	enter : function() {
	    var t = this;
	    var suite = t.parent.parent;
	    engine.addCanvasClient(engine.canvases[webgl_2d_raymarch], "RaymarchFXHelper");
		engine.pushContext(webgl_2d_raymarch, t.name + "enter");
		engine.popContext();
		t.elapsed = 0.0;
		t.completionRate = 0.0;
		if (t.prevFramesCount < 1)
		    engine.error("need at least 1 prevframe (even if not used)");
		if (t.prevFramesCount < 2 && suite.useDefaultGlow)
		    engine.error("using default glow implies at least 2 prevframes (even if not used)");
	},
	
	checkRenderTex : function() {
		var t = this;
		// Allocate render texture(s) if not yet done
		if (!t.renderTexAllocated) { // must be done inside the pushContext
			engine.pushContext(webgl_2d_raymarch, t.name + "checkRenderTex");
				t.renderTexAllocated = true;
				for (var i = 0; i < t.prevFramesCount; i++) {
					t.outputTex[i] = new Texture();
					t.outputTex[i].createRenderTexture(engine.gl, Math.floor(window.innerWidth), Math.floor(window.innerHeight), { wrap: engine.gl.CLAMP_TO_EDGE });
					t.outputTex[i].debugName = "rendertex #" + i + "for prevFrames.";
				}
				t.lastoutputTex = t.outputTex[t.curOutputTex];
				for (var i = 0; i < t.additionalPassesCount; i++) {
				    var pass = t.fragmentShaderPasses[i];
				    pass.renderTexture = new Texture();
				    pass.renderTexture.createRenderTexture(engine.gl, pass.params.outputTex.width, pass.params.outputTex.height, pass.params.outputTex);
				    pass.renderTexture.debugName = "rendertex for pass #" + i + ": " + pass.id;
                }
				engine.popContext();
		}
	},
	
	enterCurrent : function () {
		var t = this;
		t.isCurrent = true;
		if (t.interp) {
			t.interp.setInitialTime(engine.time);
			t.interp.setInitialCamera(t.parent.parent.campos);
		}
	},
	
	enter_tick : function(_pass) {		
		var t = this;
		t.checkRenderTex();
//		console.log("ENTER TICK: " + t.name);
		t.elapsed += engine.deltaTime;
		engine.pushContext(webgl_2d_raymarch, t.name + "enter_tick");

		var pass = t.fragmentShaderPasses[0];
		if (_pass)
		    pass = t.getFragmentShaderPass(_pass);
		else {
		    if (t.fragmentShaderPasses.length > 1)
		        engine.error("Multiple pass FX must indicate pass index when calling exit_tick");
		}

		var prg = pass.program;
			
		var suite = t.parent.parent;
		var gl = engine.gl;

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE2);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE3);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE4);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE5);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.activeTexture(gl.TEXTURE6);
		gl.bindTexture(gl.TEXTURE_2D, null);
        
		var fx = t.parent;
		engine.useProgram(prg);

		if (t.interp) {
			t.interp.update(t.elapsed);
			if (t.isCurrent) {
				t.getCurveValues();
				if (t.glowAmount) {
					suite.glowAmount = t.glowAmount.currentValues;
				}
				if (t.glowColorSub)
					suite.glowColorSub = t.glowColorSub.currentValues;
				if (t.blurScale)
					suite.blurScale = t.blurScale.currentValues;
				if (t.camPos)
					suite.campos = t.camPos.currentValues;
				if (t.camRot) {
					suite.camRoll = t.camRot.currentValues[0];
					suite.camPitch = t.camRot.currentValues[1];
				}
			}
		}
		/*
		if (engine.editor && engine.editor.editedFX === fx) {
			suite.campos = engine.editor.getCamPos(suite.campos);
			var rot = engine.editor.getCamRot([suite.camRoll,suite.camPitch,0]);
			suite.camRoll = rot[0];
			suite.camPitch = rot[1];
		}*/
		
		if (t.isCurrent && fx.manualCamera)
			fx.manualCamera();
			
		if (suite.camTransitionTimer > 0.0 && !suite.justSwitchedFX) {
			for (var dim = 0; dim < 3; dim++) {
				suite.campos[dim] = suite.lastFXEndCam[dim] + (suite.campos[dim] - suite.lastFXEndCam[dim]) * (suite.camTransitionTimer/suite.camTransitionDuration);
			}
			suite.camTransitionTimer -= engine.deltaTime;
		}
		
		var cam = suite.campos;
		var dZFXStartToCam = cam[2]-fx.startZ;    // delta Z from FX start to camera
		var dZFXEndToCam = cam[2]-fx.endZ;		// delta Z from FX end to camera
		t.rayZOffset = 0.0; // 0 if camera is inside FX, delta to reach camera near if camera is before fx
		t.rayMaxLength = fx.depth;
		
		if (suite.lst.length < 2) {
			if (!t.isCurrent) {
				t.enterCurrent();
			}
			fxiscurrent = true;
		} else {
			var fxiscurrent = false;
			if (dZFXEndToCam > 0.0 || dZFXStartToCam <= -fx.prev.depth) {
				// camera is beyond FX end or before fx start
				engine.popContext();
				if (dZFXEndToCam > 0.0)
					t.completionRate = 1.0;
				else {
					t.completionRate = 0.0;
				//	console.log(t.name + ": camera ends before FX start : " + dZFXStartToCam + " <= " + fx.prev.depth);
				}
				return false;				
			}
			else {
				if (dZFXStartToCam >= 0.0) {
					// camera is after FX start
					//console.log(t.name + ": camera is after FX start");
					t.rayMaxLength -= dZFXStartToCam;
					t.completionRate = dZFXStartToCam / fx.depth;
					if (!t.isCurrent) {
						t.enterCurrent();
					}
					fxiscurrent = true;
				} else {
					// camera is before fx
					//console.log(t.name + ": camera is before fx");
					t.rayZOffset = -dZFXStartToCam;
				}
			}
		}
		
		t.isCurrent = fxiscurrent;
		
		if (t.isCurrent) {
			if (engine.editor && engine.editor.editedFX != fx)
				engine.editor.enterNewFX(fx, t.name, fx.interpParams);
		}

		t.lastoutputTex = t.outputTex[t.curOutputTex];
		t.lastCamZ = cam[2];
		t.pushCommonShaderValues(prg);
		return true;
	},

	pushCommonShaderValues : function(prg) {
		var t = this;
		var suite = t.parent.parent;
		var cam = suite.campos;
		gl.uniform3fv(prg.iResolution, [t.lastoutputTex.width, t.lastoutputTex.height, 1.0]);
		gl.uniform3fv(prg.camPos, [cam[0], cam[1], t.lastCamZ]);

		gl.uniform3fv(prg.camRot, [suite.camRoll, suite.camPitch, suite.camYaw]);
		gl.uniform1f(prg.near, t.rayZOffset);
		gl.uniform1f(prg.far, t.rayMaxLength);
		gl.uniform1f(prg.fogfar, suite.fogfar);
		gl.uniform1f(prg.iGlobalTime, t.elapsed);
        
	//	engine.setTexture(t.mask, 0, true); // mask is optional
	},

	exit_tick : function(_pass) {
		var t = this;
		var suite = t.parent.parent;

		var pass = t.fragmentShaderPasses[0];
		if (_pass)
		    pass = t.getFragmentShaderPass(_pass);
		else {
		    if (t.fragmentShaderPasses.length > 1)
		        engine.error("Multiple pass FX must indicate pass index when calling exit_tick");
		}

		var prg = pass.program;


		if (t.interp)
			t.interp.pushUniformsToShader(pass.index);
		t.pushCommonShaderValues(prg);
		var rendertex = t.lastoutputTex;
		var exitrendertex = false;
		if (pass.renderTexture)
		    rendertex = pass.renderTexture;
		if (suite.useDefaultGlow || pass.renderTexture) {
		    exitrendertex = true;
		    engine.enterRenderTexture(rendertex);
        }
		for (var i = 1; i < t.prevFramesCount; i++) {
		    engine.setTexture(t.outputTex[(t.curOutputTex + i) % t.prevFramesCount], i + 2, true);
		}
			
		t.curOutputTex = (t.curOutputTex + 1) % t.prevFramesCount;
		if (pass.params.inputs) {
		    for (var ii = 0; ii < pass.params.inputs.length; ii++) {
		        var inpt = pass.params.inputs[ii];		        
		        var tex = t.getFragmentShaderPass(inpt.id).renderTexture;
		        engine.setTexture(tex, inpt.sampler);
            }
		}
		t.quad.draw(engine.gl, prg);
		if (exitrendertex)
			engine.exitRenderTexture();
		engine.popContext();
	},

	registerUniforms : function(_passIndex) {
		var t = this;
				
		var pass = t.fragmentShaderPasses[_passIndex];
		var prg = pass.program;
		engine.pushContext(webgl_2d_raymarch, t.name + "registerUniforms");
		    var gl = engine.gl;
			engine.useProgram(prg);
			var len = t.interp.list.length;
			for (var i = 0; i < len; i++) {
			    if (t.interp.list[i].progs == null)
			        t.interp.list[i].progs = [];
			    var name = t.interp.list[i].name;
			    if (!engine.isPostProcessUniform(name)) {
			        var uniName = "\"" + name + "\"";
			        var str = "prg." + name + " = engine.gl.getUniformLocation(prg, " + uniName + ");";
			   //     str += "if (null == prg." + name + ") {console.log(\"registerUniforms: Can't find uniform " + name + " in " + prg.debugName + "\");}";
			        eval(str);
			        t.interp.list[i].progs[_passIndex] = prg;
			        if (t.interp.list[i].uniform == null)
			            t.interp.list[i].uniform = [];
			        eval("t.interp.list[i].uniform[_passIndex] = prg." + name + ";");
                }
			}
							
			gl.uniform3fv(prg.camPos, [0.0, 0.0, -1.0]);
			gl.uniform3fv(prg.camRot, [0.0,0.0,0.0]);
			gl.uniform3fv(prg.lightPosNormalized, [0.5, 0.5, 0.0]);
			gl.uniform1f(prg.diffuseIntensity, 0.01);
			gl.uniform3fv(prg.diffuseColor, [1.0, 1.0, 1.0]);
			gl.uniform1f(prg.specularIntensity, 1.0);
			gl.uniform3fv(prg.specularColor, [1.0, 1.0, 1.0]);
			gl.uniform1f(prg.specularFallOff, 3.0);
			gl.uniform1f(prg.focus, 3.14159 * 0.5);
			gl.uniform1f(prg.near, 0.0);
			gl.uniform1f(prg.far, 10.0);
			gl.uniform1f(prg.fogfar, 10.0);			
        engine.popContext();
	},

	getFragmentShaderPass : function(_id) {
	    var t = this;
	    for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++)
	        if (t.fragmentShaderPasses[iPass].id == _id)
	            return t.fragmentShaderPasses[iPass];
	    return null;
	},
	
	createFX : function() {
		var t = this;
		engine.pushContext(webgl_2d_raymarch, t.name + "createFX");
			var gl = engine.gl;
	
			t.outputTex = [];
			t.curOutputTex = 0;
			for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++)
			    t.fragmentShaderPasses[iPass].program = engine.createProgramFromPrefetch(t.fragmentShaderPasses[iPass].fullShaderText, t.name + "_" + t.fragmentShaderPasses[iPass].id);
			t.quad.create(gl, -1.0, -1.0, 2.0, 2.0);

		engine.popContext();
		for (var iPass = 0; iPass < t.fragmentShaderPasses.length; iPass++)
		    t.registerUniforms(iPass);
	},
	
}
