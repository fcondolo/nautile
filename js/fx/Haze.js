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
 
function  Haze(params) {
    var t = this;
    t.params = params;
    t.hlp = new RaymarchFXHelper();
    t.hlp.construct({
        name: "RmHaze",
        fragmentShadersPasses: [{
            id: "final",
            shader: "fx/RMHaze.fs",
            inputs: null,
            outputTex: null
        }],
        parent: t,
        prevFramesCount: 4
    });
    t.interpParams = [];
    t.textures = [];
    t.textureParams = [];
    t.allParams = {};
 
    // Camera
    t.prevCam = [0.0, 0.0, 0.0];
    t.prevCamRoll = 0.0;
    t.textratio = 1.0;
    t.exitRectDone = false;
    t.rotateAmount  = 0.0;
    t.greets = [
        { x: 0.01, y: 0.15, string: " ", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: 0.05  }},
        { x: 0.75, y: 0.15, string: "ASD", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: -0.05 } },
        { x: 0.01, y: 0.95, string: "Razor 1911", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: 0.05 } },
        { x: 0.65, y: 0.85, string: "Fairlight", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: -0.05  }},
        { x: 0.65, y: 0.15, string: "Mercury", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: -0.05  }},
        { x: 0.7, y: 0.15, string: "Cocoon", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: 0.05  }},
        { x: 0.01, y: 0.15, string: "Alcatraz", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: 0.05  }},
        { x: 0.01, y: 0.85, string: "Desire", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: 0.05  }},
        { x: 0.3, y: 0.95, string: "Conspiracy", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: -0.05  }},
        { x: 0.8, y: 0.15, string: "Still", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: 0.05  }},
        { x: 0.01, y: 0.15, string: "Loonies", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: 0.05 } },
        { x: 0.01, y: 0.95, string: "TRSI", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: -0.05 } },
        { x: 0.77, y: 0.95, string: "Lemon", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, xspd: -0.05  }},
        { x: 0.75, y: 0.15, string: "RGBA", fillStyle: "#FFFFFF", alpha: 1.0, fadeOut: { wait: 0.0, duration: 4.0, yspd: 0.05  }}
]
    t.curGreetIndex = 0;
    t.frontCvsAdded = false;
    t.remaining = 100.0;
}

Haze.prototype = {

	loadTextures : function(_reload) {
		var t = this;
		engine.pushContext(webgl_2d_raymarch, "Haze preloadResources");
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
	    engine.frontContext.font = (125 * window.innerWidth / 1920.0).toString() + "px JSGL";
		t.hlp.exit();
		for (var i = 0; i < t.textures.length; i++)
		    t.textures[i].release();
		if (!t.exitRectDone) { // safe fallback for slow machines
		    t.checkFrtCvs();
		    t.exitRectDone = true;
		    engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#000000", alpha: 1.0, fadeIn: { wait: 0.0, duration: 0.5 }, fadeOut: { wait: 0.0, duration: 3.0 } });
		}
	//	engine.frontContext.font = t.saveFont;
	},

		
	enter : function() {
		var t = this;
		t.hlp.enter();
		engine.pushContext(webgl_2d_raymarch, "Haze enter");
		    var prg = t.hlp.getFragmentShaderPass("final").program;
		    prg.textratio = engine.gl.getUniformLocation(prg, "textratio");
		    prg.remaining = engine.gl.getUniformLocation(prg, "remaining");
		    engine.popContext();
		t.timeAtEnter = engine.time;
	//	t.saveFont = engine.frontContext.font;
	//	engine.frontContext.font = "100px JSGL";
	},

	manualCamera : function() {
	    var t = this;
	    var suite = t.parent;
	    suite.campos[0] = 2.0;
	    suite.campos[1] = 3.0;
	    suite.campos[2] = t.prevCam[2] + 19.7 * engine.deltaTime;
	    suite.camYaw = Math.cos(engine.time);
	    suite.camRoll = t.prevCamRoll + 0.2 * engine.deltaTime;
/*	    if (t.rotateAmount > 0.85) {
	        suite.camRoll += t.rotateAmount * 0.3;
	        t.rotateAmount -= engine.deltaTime;
	    }*/
	    if (t.rotateAmount > 0.0) {
	        var amount = Math.min(engine.deltaTime * t.rotateAmount * 15.0, t.rotateAmount);
	        suite.camRoll += amount;
	        t.rotateAmount -= amount;
	    }
	    t.prevCamRoll = suite.camRoll;
	    suite.camPitch = Math.sin(engine.time*0.9)*0.5;
	    t.prevCam[0] = suite.campos[0];
	    t.prevCam[1] = suite.campos[1];
	    t.prevCam[2] = suite.campos[2];
	},
	
	checkFrtCvs: function () {
	    var t = this;
	    if (!t.frontCvsAdded) {
	        engine.addCanvasClient(engine.frontCanvas, "Haze checkFrtCvs");
	        t.frontCvsAdded = true;
        }
	},

	tick : function(time, _gl, remaining) {
		var t = this;
		var cam = t.parent.campos;
		if (!t.hlp.enter_tick())
			return false;
		t.remaining = remaining;

		var time = engine.time - t.timeAtEnter;

		engine.setTexture(t.textures[0], 1, true);
		engine.setTexture(t.textures[1], 7, true);
		engine.setTexture(t.textures[2], 0, true);
		var prg = t.hlp.getFragmentShaderPass("final").program;

		t.textratio = Math.abs(Math.cos(time*0.25));
		engine.gl.uniform1f(prg.textratio, t.textratio);
		engine.gl.uniform1f(prg.remaining, t.remaining);

		if (beatHandler.beatOccuredThisFrame) {
		    t.rotateAmount = 1.0;
		    if (t.curGreetIndex < t.greets.length) {
		        t.checkFrtCvs();
		        var entry = t.greets[t.curGreetIndex++];
		        engine.text2d.addEntry(entry);
            }
		}

		t.hlp.exit_tick();
		
		if (remaining < 1.5 && !t.exitRectDone) {
		    t.checkFrtCvs();
		    t.exitRectDone = true;
		    engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#000000", alpha: 1.0, fadeIn: { wait: 0.0, duration: 1.0 }, fadeOut: { wait: 0.0, duration: 5.0 } });
		}

		return true;

	},

	createFX : function() {
		var t = this;
		t.hlp.createFX();
	}
	
	
}
