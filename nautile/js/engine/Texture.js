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
function Texture() {
	var t = this;
	t.texture = null;
	t.loaded = false;
	t.context = engine.gl;
}
 
 Texture.prototype = {
	/**
		Callback called by load()
		don't call this function directly
		@param gl the OpenGL context
	**/
	 onLoaded : function (_gl) {
		var t = this;
		var gl = t.context;
		if (null == gl) {
			gl = engine.gl || _gl;
			t.context = gl;
		}

	     //	console.log("onLoaded: " + t.texture.image.src);
		t.context = gl;
		gl.bindTexture(gl.TEXTURE_2D, t.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t.texture.image);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		if (t.clampToEdge) {
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
			gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);		
		}
		gl.bindTexture(gl.TEXTURE_2D, null);
		t.width = t.texture.image.width;
		t.height = t.texture.image.height;
		t.format = gl.RGBA;
		t.type = gl.UNSIGNED_BYTE;
		t.loaded = true;
		if (!t.keepImage)
			t.texture.image = null;
	},


	/**
		Loads a texture
		@param gl the OpenGL context
		@param url path to the texture file
	**/
	 load :  function(_gl, url) {
		var t = this;
		var gl = t.context;
		if (null == gl) {
			gl = engine.gl || _gl;
		}
		t.context = gl;
		t.texture = gl.createTexture();
		t.texture.image = new Image();
		t.texture.image.onload = function () {
			t.onLoaded(gl)
			console.log ("loaded texture " + url + ", width:" + t.width + ", height:" + t.height);
		}
		t.texture.image.src = url;
		var checkExist = new XMLHttpRequest();
		checkExist.open('HEAD', url, false);
		checkExist.setRequestHeader('Cache-Control', 'no-cache');
		checkExist.send();
		if (checkExist.status===404) {
			engine.error("File not found: " + url);
			return false;
		}
		return true;
	},
	
	createFromImage: function(_gl, _img, _url) {
		var t = this;
		var gl = t.context;
		t.context = _gl;
		t.texture = _gl.createTexture();
		t.texture.image = _img;
		t.loaded = true;
		t.onLoaded(_gl)
	},

	release : function() {
	    var t = this;
	    t.context.deleteTexture(t.texture);
	},

	createRenderTexture : function (_gl, width, height, _options) {
		var t = this;
		gl = engine.gl;
		if (_options.type == gl.FLOAT) {
		    var floatTextures = gl.getExtension('OES_texture_float');
		    if (!floatTextures) {
		        engine.error('no floating point texture support');
		        return;
		    }
		}
		var options = {};
        if (_options)
            options = _options;
        if (null == options.magFilter) options.magFilter = gl.LINEAR;
        if (null == options.minFilter) options.minFilter = gl.LINEAR;
        if (null == options.wrapS) options.wrapS = gl.CLAMP_TO_EDGE;
        if (null == options.wrapT) options.wrapT = gl.CLAMP_TO_EDGE;
        if (null == options.format) options.format = gl.RGBA;
        if (null == options.type) options.type = gl.UNSIGNED_BYTE;

		t.texture = gl.createTexture();
		t.context = gl;
		t.width = width;
		t.height = height;
		t.format = options.format;
		t.type = options.type;
		gl.bindTexture(gl.TEXTURE_2D, t.texture);
		gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, options.magFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, options.minFilter);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, options.wrapS);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, options.wrapT);		
		gl.texImage2D(gl.TEXTURE_2D, 0, t.format, width, height, 0, t.format, t.type, null);
	}
}
