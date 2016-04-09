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
function ResourceManager() {
	var t = this;
	t.textures = new Array();
	t.shaderLoaders = new Array();
	t.resources = new Array();
	t.logFailuresCount = 0;
	t.loadingRatio = 1.0;
}

ResourceManager.prototype = {
	prefetchTexture : function(texture, keepImageAfterLoading, clampToEdge) {
		var t = this;
		
		if (t.resources[texture]) {
			console.log("TEXTURE CACHE HIT for: " + texture);
			return t.resources[texture];
		}
			
		var tex = new Texture();
		if (keepImageAfterLoading)
			tex.keepImage = true;
		else
			tex.keepImage = false;
		
		if (clampToEdge)
			tex.clampToEdge = true;
		else
			tex.clampToEdge = false;
		
		if (!tex.load(engine.gl, texture))
			return null;
		tex.fname = texture;
		t.textures.push(tex);
		t.resources[texture] = tex;
		return tex;
	},
	
	prefetchShaderFiles : function(vtx, frgmt, _forceSync) {
		var t = this;
		var gl = engine.gl;
		
		var vs = new ShaderLoader(vtx, gl.VERTEX_SHADER);
		var fs = new ShaderLoader(frgmt, gl.FRAGMENT_SHADER);
		var doForceSync = false;
		if (_forceSync)
			doForceSync = true;
		vs.loadAsync(gl, doForceSync);
		fs.loadAsync(gl, doForceSync);
		t.shaderLoaders.push(vs);
		t.shaderLoaders.push(fs);
		return [vs, fs];
	},
	
	getReadyStateText : function(state) {
		switch (state) {
			case 0: return "UNSENT"; break;
			case 1: return "OPENED"; break;
			case 2: return "HEADERS RECEIVED"; break;
			case 3: return "LOADING"; break;
			case 4: return "DONE"; break;
			default: return "UNKNOWN"; break;
		}
	},

	getNextResourceToload : function() {
		var t = this;
		
		for (var i = 0; i < t.textures.length; i++) {
			if (!t.textures[i].loaded)
				return t.textures[i].fname;
		}
		
		for (var i = 0; i < t.shaderLoaders.length; i++) {
			var loader = t.shaderLoaders[i];
			if (!loader.loaded) {
				return loader.urlList;
			}
		}
	},
	
	flushTex : function() {
		var t = this;
		
		for (var i = 0; i < t.textures.length; i++) {
			if (!t.textures[i].loaded)
				t.textures.remove(i);
		}
	},

	isReady : function() {
		var t = this;
		var tsolved = 0;
		var ssolved = 0;
		var maxLogFailuresBeforeLog = 50;
		
		for (var i = 0; i < t.textures.length; i++) {
			if (t.textures[i].loaded)
				tsolved++;
		}
		
		for (var i = 0; i < t.shaderLoaders.length; i++) {
			var loader = t.shaderLoaders[i];
			if (loader.loaded && loader.shader != null) {
				ssolved++;
			}
			else {
				if (t.logFailuresCount > maxLogFailuresBeforeLog) {
					console.log("ResourceManager : " + loader.urlList + " NOT ready, requested:" + loader.requested + "/" + loader.urlList.length);
					for (var j = 0; j < loader.requests.length; j++) {
						var request = loader.requests[j];
						console.log("readystate: " + t.getReadyStateText(request.readyState) + ", status: " + request.status + ", statustext:" + request.statusText);
					}
				}
			}
		}
		if (t.logFailuresCount > maxLogFailuresBeforeLog)
			console.log("ResourceManager : " + tsolved + "/" + t.textures.length + " textures ready, " + ssolved + "/" + t.shaderLoaders.length + " shaders ready");
			
		var allSolved = tsolved == t.textures.length && ssolved == t.shaderLoaders.length;
		if (allSolved || t.logFailuresCount > maxLogFailuresBeforeLog)
			t.logFailuresCount = 0;
		else
			t.logFailuresCount++;
		var solvedCount = tsolved + ssolved;
		if (beatHandler && beatHandler.AudioIsLoaded)
		    solvedCount++;
		var scriptsToLoad = 0;
		if (typeof jsLoader_loaded != "undefined") {
		    solvedCount += jsLoader_totalLoad - jsLoader_leftToLoad;
		    scriptsToLoad = jsLoader_totalLoad;
		}
		solvedCount += paramsLoader_totalLoad-paramsLoader_leftToLoad;
		t.loadingRatio = solvedCount / (t.textures.length + t.shaderLoaders.length + scriptsToLoad + paramsLoader_totalLoad + 1); // + 1 for music
		return allSolved;
	}	
}