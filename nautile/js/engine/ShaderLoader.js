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
function ShaderLoader(url, type) {
	var t = this;
	t.shader=null;
	t.type = type;
	t.urlList = url;
	t.counter = 0;
	t.script = new Array();
	t.requests = new Array();
	t.loaded = false;
	t.requested = 0;
}

ShaderLoader.prototype= {
		decompress : function(s) {
		var compressor = new LZW();
		return compressor.decompress(s);
		},
		
		oneMoreFileLoaded : function (gl) {
			var t = this;
			t.counter++;
			if (t.counter == t.urlList.length) {
				t.compile(gl, t.urlList);
				t.loaded = true;
			}
		},
		
		loadAsync : function (gl, _forceSync) {
			var t = this;
			
			for (var i = 0; i < t.urlList.length; i++) {
				var request = new XMLHttpRequest();
				request.rurl = t.urlList[i];
				var async = true;
				if (_forceSync)
					async  =false;
				request.open('GET', t.urlList[i], async);	// async
				request.setRequestHeader('Cache-Control', 'no-cache');
				request.rindex = i;
				request.onreadystatechange = function () {
					if (this.readyState == 4) {
						t.script[this.rindex] = this.responseText;						
						t.oneMoreFileLoaded(gl);
					}
				};
				var hasError = false;
				try {
					request.send(null);
					t.requests.push(request);
					t.requested++;
				} catch (e) {
					hasError = true;
				}			
				if (request.status === 404)
					hasError = true;
				if (hasError)
					engine.error("Error loading file:\n" + t.urlList[i]+ "\n" + e.toString() + "\nMake sure file exists and HTTP Cross origin requests are enabled for your browser, or run the online version");
			}
		},


	compile : function(gl, url){
		var t = this;
		t.fullScript = "";
		for (var i = 0; i < t.script.length; i++)
			t.fullScript += t.script[i];
		t.shader = gl.createShader(t.type);
		gl.shaderSource(t.shader, t.fullScript);
		gl.compileShader(t.shader);
		if (!gl.getShaderParameter(t.shader, gl.COMPILE_STATUS)) {
			engine.error("Shader compilation error:\nfiles:"+url+"\n"+gl.getShaderInfoLog(t.shader)+"\nsource:\n"+t.fullScript);
			engine.error("Shader compilation mess. Check console");
			engine.switchPause(true);
		}
		else {
			console.log("Shader compiled from source(s):" + t.urlList);
		}
		t.script = []; // free some memory
	}
}