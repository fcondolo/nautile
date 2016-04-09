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


// const not supported by minifiers
webgl_2d_raymarch = 0;
webgl_2d_frontSprites = 1;
LOD_level_1 = 0.75;
LOD_level_2 = 0.5;
SHOW_ERRORS = false;
DEBUG_WEBGL = false;
RECORD_VIDEO = false;


function clickLink(link)
{
   var allowDefaultAction = true;
	  
   if (link.click)
   {
	  link.click();
	  return;
   }
   else if (document.createEvent)
   {
	  var e = document.createEvent('MouseEvents');
	  e.initEvent(
		 'click'     // event type
		 ,false      // can bubble?
		 ,false      // cancelable?
	  );
	  allowDefaultAction = link.dispatchEvent(e);           
   }
		 
   if (allowDefaultAction)       
   {
	  var f = document.createElement('form');
	  f.action = link.href;
	  document.body.appendChild(f);
	  f.submit();
   }
}

/**
 * @constructor
 */
function Engine(defaultUpdate) {
	var t = this;
	t.time = 0.0;
	t.lastupdateTime = -1.0;
	t.gl = null;
	t.canvas = null;
	t.currentProgram = null;
	t.deltaTime = 0.0;
	t.lastTime = 0.0;
	t.globalUpdate = null;
	t.defaultUpdate = defaultUpdate;
	t.contexts = new Array();
	t.canvases = new Array();
	t.text2d = new Text2d();
	t.savedContexts = [];
	t.timeAtMusicLoop = 0.0;
	t.framebuffer = [];
	t.renderbuffer = [];
	
	t.recordFrameIndex = 0;

	t.click = false;
	t.key = 0;
	t.savedViewport = null;
	
	// framerate regulation
	t.autoFrameRate = true;
	t.autoFrameRateTex = null;
	t.lowFrameRateCounter = 0.0;
	t.scaleGL = 1.0;
	t.timeWithGoodFrameRate = 0.0;
	t.forceLODTimer = 0.0;
	t.LODBeforeForce = null;
	t.lastLODRefWidth = window.innerWidth;
	t.lastLODRefHeight = window.innerHeight;
	if (t.autoFrameRate) {
		t.lodTex = [];
	}
	t.pauseBeat = false;
	t.paused = false;
	t.refreshWhilePaused = false;
	t.musicDelta = 0.0;
	
	if (typeof Editor != "undefined") t.editor = new Editor();
	else t.editor = null;
	t.shiftDown = false;
	t.ctrlDown = false;
	t.doCatchKeyboard = true;
	t.postProcessUniforms = ["glowColorSub", "gaussFilter", "glowAmount", "glowBlurScale"];
}

Engine.prototype = {
	breakpoint: function() {
		console.log("BP");
		debugger;
	},

	error: function(_label) {
		if (!SHOW_ERRORS) return;
		console.error(_label);
		alert(_label);
		var data = new FormData();
		data.append("data" , _label);
		var xhr = (window.XMLHttpRequest) ? new XMLHttpRequest() : new activeXObject("Microsoft.XMLHTTP");
		xhr.open( 'post', 'debug/logerror.php', true );
		xhr.send(data);		
	},

	onfocus : function() {
		var t = this;
		t.shiftDown = false;
		t.ctrlDown = false;
		t.doCatchKeyboard = true;
		t.isMouseDown = false;
		t.mousePos = [0,0];
		t.mouseWhenClicked = [0,0];
		t.mouseDelta = [0,0];
	},

	onblur : function() {
	},
	
	doPauseBeat : function(_pause) {
		this.pauseBeat = _pause;
	},
	
	isSpecialKeyPressed : function () {
		var t = this;
		if (t.shiftDown || t.ctrlDown)
			return true;
		return false;
	},

	startRecordVideo : function () {
		var t = this;
		RECORD_VIDEO = true;
		t.recordVidIndex = 0;
		console.log("Started recording video frames...");
	},

	
	stopRecordVideo : function () {
		var t = this;
		RECORD_VIDEO = false;
		alert("Recorded until:\n" + "capture/" + SESSION + "/" + ('000000' + t.recordVidIndex).slice(-8) + '.png');
	},

	forceLOD: function(_duration) {
		var t = this;
		if (t.forceLODTimer > 0.0)
			return; // important!
		t.forceLODTimer = _duration;
		t.LODBeforeForce = t.autoFrameRateTex;
	},
	
	addCanvasClient: function (cvs, from) {
	    var t = this;
	    if (cvs.locked)
	        return;
	    var _from = from || "undocumented";
	    if (cvs.refCount == 0) {
			cvs.style.display="block";
			console.log("Showing canvas " + cvs.id + " from " + _from);
		} else console.log("New client for already active canvas " + cvs.id + " : " + _from);

		cvs.refCount++;
		//console.log("Canvas " + cvs.id + " has now " + cvs.refCount + " clients.");
	},
	

	removeCanvasClient: function(cvs, from) {
		var t = this;
		if (cvs.locked) {
		    t.text2d.clearAll();
		    return;
        }
		if (null == cvs)
			t.error("engine::removeCanvasClient BAD ARG");
		if (cvs.refCount == 1) {
			cvs.style.display="none";
			var _from = from || "undocumented";
			console.log("Hiding canvas " + cvs.id + " from " + _from);
		}
		cvs.refCount--;
		if (cvs.refCount < 0)
			t.error("Bad refCount for canvas " + cvs.id);
		//console.log("Canvas " + cvs.id + " has now " + cvs.refCount + " clients.");
	},


	getDebugDraw : function() {
		var t = this;
		if (!resman)
			return null;
		if (!t.debugDraw)
			t.debugDraw = new DebugDraw();
		return t.debugDraw;
	},
	
	forceTime : function(time) {
		var t = this;
		t.time = time;
		t.lastTime = time-t.deltaTime;
	},
	
	initProgram : function(program) {
		var t = this;
		var gl = t.gl;
		if (program.context != gl) {
			t.error("engine::initProgram --> Program belongs to context " + program.context.canvas.id + " while current context is " + gl.canvas.id);
		}
		gl.linkProgram(program);
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
			t.error("Could not link program:" + gl.getProgramInfoLog(program));
			return false;
		}
		
		// Bind default common variables
		program.vertexData = gl.getAttribLocation(program, "vertexData");
		
		program.transfo2D = gl.getUniformLocation(program, "transfo2D");
		program.scale2D = gl.getUniformLocation(program, "scale2D");
		program.iResolution = gl.getUniformLocation(program, "iResolution");
		program.iGlobalTime = gl.getUniformLocation(program, "iGlobalTime");
		program.RaymarchMinDistDistortion = gl.getUniformLocation(program, "RaymarchMinDistDistortion");
		program.sampler0Uniform = gl.getUniformLocation(program, "uSampler0");
		program.sampler1Uniform = gl.getUniformLocation(program, "uSampler1");
		program.sampler2Uniform = gl.getUniformLocation(program, "uSampler2");
		program.sampler3Uniform = gl.getUniformLocation(program, "uSampler3");
		program.sampler4Uniform = gl.getUniformLocation(program, "uSampler4");
		program.sampler5Uniform = gl.getUniformLocation(program, "uSampler5");
		program.sampler6Uniform = gl.getUniformLocation(program, "uSampler6");
		program.sampler7Uniform = gl.getUniformLocation(program, "uSampler7");
		program.beatBarFader = gl.getUniformLocation(program, "beatBarFader");
		return true;
	},

	createProgramFromPrefetch : function(shaders, debugName) {
		var t = this;		
		var gl = t.gl;
		
		if (!shaders)
			t.error("Engine.createProgramFromPrefetch : null shaders");

		if (!shaders[0].loaded)
			t.error("Engine.createProgramFromPrefetch : vertex shader not loaded");

		if (!shaders[1].loaded)
			t.error("Engine.createProgramFromPrefetch : fragment shader not loaded");
		
		// create openGL program
		var program = gl.createProgram();
		
		// load and link shaders
		gl.attachShader(program, shaders[0].shader);
		gl.attachShader(program, shaders[1].shader);
		
		if (!debugName || !debugName.length) {
			debugName = "";
			for (var i=0; i<shaders.length; i++) {
				debugName += "  -- index: "+i+" -- ";
				for (var j=0; j<shaders[i].urlList.length; j++)
					debugName += shaders[i].urlList[j] + " -- ";
			}
		}

		program.context = gl;

		program.debugName = debugName || "noname";
		t.saveServerFile("debug/" + program.debugName + ".txt", shaders[1].fullScript);

		if (!t.initProgram(program)) {
			console.error("wrong shader:" + debugName);
			console.error("code:" + shaders[1].fullScript);
			t.switchPause(true);
		}
		return program;
	},
		
	/**
		Sets a program (set of shaders) as the current program
		@param program the program to use
	**/
	useProgram : function(program){
		var t = this;
		var gl = t.gl;

		if (program.context != gl) {
			t.error("engine::useProgram --> Program belongs to context " + program.context.canvas.id + " while current context is " + gl.canvas.id);
		}

		gl.useProgram(program); 
		
		// set default values for variables
		if (program.iResolution) gl.uniform3fv(program.iResolution, [t.canvas.width, t.canvas.height, 1.0]);
		if (program.iGlobalTime) gl.uniform1f(program.iGlobalTime, t.time);
		if (program.RaymarchMinDistDistortion) gl.uniform1f(program.RaymarchMinDistDistortion, 0.0);
		if (beatHandler && !t.pauseBeat && program.beatBarFader) {
		    if (program.beatBarFader) gl.uniform1f(program.beatBarFader, beatHandler.beatBarFader);
		}
		t.currentProgram = program;
	},

	setCanvasZIndex : function (canvasName, z) {
		document.getElementById(canvasName).setAttribute('style', 'z-index: '+z+'; position:absolute; left:0px; top:0px;');
	},

	switchContext : function (index) {
		var t = this;
		if (t.contexts[index].isHidden)
			t.error("Switching to hidden context " + t.contexts[index].id);
		t.gl = t.contexts[index];
		t.canvas = t.canvases[index];
		if (t.canvas == null)
			t.error("Engine.switchContext: switching to null canvas index " + index);
		if (t.gl == null)
			t.error("Engine.switchContext: switching to null context index " + index);
		//if (!t.canvas.refCount ||t.canvas.refCount == 0)
		//	t.error("Engine.switchContext: switching to canvas with no client. index: " + index);
		t.curContextIndex = index;
	},

	clearAllContexts: function() {
		var t = this;
		t.switchContext(webgl_2d_raymarch);
		t.clearContext(0, 0, 0, 0);
		t.gl.flush();
		t.text2d.clearAll();

		var ctx = t.frontContext;
		ctx.translate(0.0, 0.0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, t.frontCanvas.width, t.frontCanvas.height);

		ctx = t.contexts[webgl_2d_frontSprites];
		ctx.translate(0.0, 0.0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, t.canvases[webgl_2d_frontSprites].width, t.canvases[webgl_2d_frontSprites].height);
	},
	
	clearContext : function (_r, _g, _b, _a) {
		var t = this;	
		var r = _r || 0.0;
		var g = _g || 0.0;
		var b = _b || 0.0;
		var a = _a || 0.0;
		t.gl.viewport(0, 0, t.canvas.width, t.canvas.height);	
		t.gl.clearColor(r, g, b, a);
		t.gl.clear(t.gl.COLOR_BUFFER_BIT | t.gl.DEPTH_BUFFER_BIT);
	},

	pushContext : function (index, user) {
		var t = this;
		t.savedContexts.push({ctx:t.curContextIndex, usr:user});
		t.switchContext(index);
	},
	
	draw2dText: function (_entry) {
		var t = this;
//		t.frontContext.save();
		if (null != _entry.fillStyle)
			t.frontContext.fillStyle=_entry.fillStyle;
		if (null != _entry.font)
			t.frontContext.font=(_entry.font*window.innerWidth/1920.0).toString()+"px JSGL";
		if (null != _entry.alpha)
			t.frontContext.globalAlpha =_entry.alpha;
		t.frontContext.fillText(_entry.string, _entry.x * window.innerWidth, _entry.y * window.innerHeight, window.innerWidth);
//		t.frontContext.restore();

	},

	declareUniforms: function (prog, uniforms) {
	    alert("check deprecated");
		var t = this;
		for (var i = 0; i < uniforms.length; i++) {
			var uniName = "\""+uniforms[i].uniform+"\"";
			var str = "prog."+uniforms[i].uniform+" = t.gl.getUniformLocation(prog, "+uniName+");";
		//	str += "if (null == prog."+uniforms[i].uniform+") {console.log(\"declareUniforms: Can't find uniform: "+uniforms[i].uniform+"\");}";
			eval(str);
			if (uniforms[i].interp) {
				eval("uniforms[i].interp.getByName(uniforms[i].uniform).uniform = prog." + uniforms[i].uniform);
				uniforms[i].interp.getByName(uniforms[i].uniform).prog = prog;
			}			
		}
	},
	
	isPostProcessUniform : function(_name) {
	    var t = this;
	    var l = t.postProcessUniforms.length;
	    for (var i = 0; i < l; i++) {
	        if (t.postProcessUniforms[i] == _name)
	            return true;
	    }
	    return false;
	},

	dumpContexts : function () {
		var t = this;
		var ret = " - DUMP CONTEXTS: -\n";
		for (var i = 0; i < t.savedContexts.length; i++) {
			ret += "index: " + t.savedContexts[i].ctx + ", user:" + t.savedContexts[i].usr + "\n";
		}
		console.log (ret);
		return ret;
	},
	
	popContext : function (index, user) {
		var t = this;
		if (t.savedContexts.length <= 0) {			
			t.error("Engine::popContext --> popping more contexts than pushed. Check dumped contexts in console:\n" + t.dumpContexts());
		}
		t.switchContext(t.savedContexts[t.savedContexts.length-1].ctx);
		t.savedContexts.pop();
	},

	VerifyContextStackDepth : function () {
		var t = this;
		if (t.savedContexts.length != 0) {
			t.error("engine::VerifyContextStackDepth failed! Check dumped contexts in console:" + t.dumpContexts());
		}
	},
	
	
	/**
		Initializes the engine
		@param fps		desired frames per second.
		@param music	if not null, DOM element that contains the music to synchronize with
	**/
	init : function(fps, music){
		var t = this;
		
		t.startErrorSystem();

		// trick to load font
		t.fontLoader = new Image;
		t.fontLoader.src = FONT;
		t.fontLoaded = false;
		t.fontLoader.onerror = function() { 
		    t.fontLoaded = true; // need file to be loaded to realize it's not an image
		    t.frontContext.font = (125 * window.innerWidth / 1920.0).toString() + "px JSGL";
//			document.getElementById("Text2TextureCanvas").getContext("2d").font = "50px JSGL";
		};
		
		document.getElementById('canvas_div').style.cursor = "none";
		t.canvases[webgl_2d_raymarch] = document.getElementById("canvas2d");
		t.canvases[webgl_2d_frontSprites] = document.getElementById("spritesCanvas");
		t.frontCanvas = document.getElementById("frontCanvas");
		t.frontContext = t.frontCanvas.getContext("2d");
		t.frontContext.fillStyle="#FFFFFF";
		t.frontCanvas.style.display = "none";
		t.frontCanvas.refCount = 0;
		for (var i = 0; i < t.canvases.length; i++) {
		    if (null != t.canvases[i]) {
		        if (i == webgl_2d_frontSprites) {
		            t.contexts[webgl_2d_frontSprites] = t.canvases[webgl_2d_frontSprites].getContext("2d");
		        }
                else {
                    if (DEBUG_WEBGL)
                        t.contexts[i] = WebGLDebugUtils.makeDebugContext(t.canvases[i].getContext("webgl"));
                    else
                        t.contexts[i] = t.canvases[i].getContext("webgl");
                    if (t.contexts[i] == null)
                        t.contexts[i] = t.canvases[i].getContext("experimental-webgl");
                    if (t.contexts[i] == null)
                        t.error("Can't create webgl context for canvas #" + i);
                    t.switchContext(i);
                    t.gl.viewport(0, 0, t.canvas.width, t.canvas.height);	
                    t.gl.clearColor(0, 0, 0, 1);
                    t.gl.clear(t.gl.COLOR_BUFFER_BIT | t.gl.DEPTH_BUFFER_BIT);
                }
			}
		    t.canvases[i].style.display = "none";
		    t.canvases[i].refCount = 0;
        }
		t.initMouse();
		
		if (t.autoFrameRate) {
			t.pushContext(webgl_2d_raymarch);			
				t.lodTex[0] = new Texture();
				t.lodTex[1] = new Texture();
				t.lodTex[0].createRenderTexture(t.gl, Math.floor(window.innerWidth * LOD_level_1), Math.floor(window.innerHeight * LOD_level_1), {wrap : engine.gl.CLAMP_TO_EDGE});
				t.lodTex[1].createRenderTexture(t.gl, Math.floor(window.innerWidth * LOD_level_2), Math.floor(window.innerHeight * LOD_level_2), {wrap : engine.gl.CLAMP_TO_EDGE});
			t.popContext(webgl_2d_raymarch);			
		}
			
		var aspect = t.canvas.width / t.canvas.height;
	
		window.requestAnimFrame = (function(){
		  return  window.requestAnimationFrame       ||
				  window.webkitRequestAnimationFrame ||
				  window.mozRequestAnimationFrame    ||
				  function( callback ){
					window.setTimeout(callback, 1000.0 / fps);
				  };
		})();
		
		(function animloop(){
			requestAnimFrame(animloop);
			var newtime = t.time;
			if (t.editor && t.editor.shown)
				t.editor.update();

			if (RECORD_VIDEO) {
				newtime += 1.0/fps;
			} else {
			    if (null == t.music || t.music.paused) {
					if (!t.paused)
					    newtime += 1.0 / fps;
				}
			    else {
			      //  console.log("Music time:" + t.music.currentTime)
					newtime = t.music.currentTime + t.musicDelta;
//					if (newtime+t.timeAtMusicLoop < t.time-10.0)
	//					t.timeAtMusicLoop = t.time+0.0001;
				}
			}
			if (newtime != t.lastupdateTime) {
			    if (null != t.music || !t.paused)
			        t.time = newtime;// + t.timeAtMusicLoop;
				if (!t.paused || t.refreshWhilePaused) {
					t.refreshWhilePaused = false;
					t.render();
					t.text2d.update();
					t.lastupdateTime = newtime;
				}
			}

			if (RECORD_VIDEO) {
			    t.contexts[webgl_2d_frontSprites].drawImage(t.canvases[webgl_2d_raymarch], 0, 0);
			    if (t.frontCanvas.refCount > 0)
			        t.contexts[webgl_2d_frontSprites].drawImage(t.frontCanvas, 0, 0);
			    var data = t.canvases[webgl_2d_frontSprites].toDataURL();
			    var headname = "img";
				if (t.recordVidIndex < 10)
					headname += '000000';
				else if (t.recordVidIndex < 100)
					headname += '00000';
				else if (t.recordVidIndex < 1000)
					headname += '0000';
				else if (t.recordVidIndex < 10000)
					headname += '000';
				else if (t.recordVidIndex < 100000)
					headname += '00';
				else if (t.recordVidIndex < 1000000)
					headname += '0';
					
				var fname = "capture/" + SESSION + "/" + (headname + t.recordVidIndex) + '.png';
				if (t.editor && t.editor.shown)
					t.editor.status("Time: " + t.time.toFixed(2) + " - Image: " + fname);
				$.post("saveimg.php", {
				    imageData: data,
					name: fname
				}, function(data) {
					//window.location = data;
				});
/*
				t.recordVidLink.href = t.canvases[webgl_2d_raymarch].toDataURL('image/jpeg', .95);
				t.recordVidLink.download = ('000000' + t.recordVidIndex).slice(-8) + '.jpg';
				console.log(t.recordVidLink.download);
				clickLink(t.recordVidLink);*/
				t.recordVidIndex++;
			}
//			if (t.paused)
	//			console.log("PAUSED AT TIME: " + t.time);
		})();

        // lock front canvas
		t.addCanvasClient(t.frontCanvas, "lockCanvases");
		var ctx = t.frontContext;
		ctx.fillStyle = "#000000";
		ctx.globalAlpha = 1.0;
		ctx.translate(0.0, 0.0);
		ctx.setTransform(1, 0, 0, 1, 0, 0);
		ctx.clearRect(0, 0, t.frontCanvas.width, t.frontCanvas.height);
		t.frontCanvas.locked = true;
	},

	mouseClick : function() {
		var t = this;
		t.click = true;
		console.log("click at time:" + t.time);
	},
	
	checkKeypressWhenPaused : function(_key) {
	    var t = engine;
	    if (!t.editor)
	        return;
		
		if (t.isSpecialKeyPressed())
			return false;
		
		if (_key == 37) { // left
			if (t.music) t.music.currentTime = Math.max(0.0, t.music.currentTime - 1.0);
			else t.time = Math.max(0.0, t.time - 1.0);
			t.refreshWhilePaused = true;
			editor.hasTimeControl = true;
			localStorage.setItem("TC", 1); // Editor has time control
		}
		else if (_key == 39) { // right
			if (t.music) t.music.currentTime += 1.0;
			else t.time += 1.0;
			t.refreshWhilePaused = true;
			editor.hasTimeControl = true;
			localStorage.setItem("TC", 1); // Editor has time control
		}		
		else if (_key == 40) { // down
			if (t.music) t.music.currentTime = Math.max(0.0, t.music.currentTime - 1.0/30.0);
			else t.time = Math.max(0.0, t.time - 1.0/30.0);
			t.refreshWhilePaused = true;
		}
		else if (_key == 38) { // up
			if (t.music) t.music.currentTime += 1.0/30.0;
			else t.time += 1.0/30.0;
			t.refreshWhilePaused = true;
		}
		return false;
	},

	switchPause : function(_force) {
		var t = this;
		if (_force)
			t.paused = true;
		else
			t.paused = !t.paused;
		if (t.paused) {
		    if (t.music) {
		        t.music.pause();
		    }
		}
		else if (t.music) {
		    t.music.play();
        }

		if (t.editor) {
		    editor.hasTimeControl = true;
		    localStorage.setItem("TC", 1); // Editor has time control
		}
	},
	
	
	catchKeyboard : function (_status) {
		var t = this;
		t.doCatchKeyboard = _status;
	},
	
	keyDown : function(_evt) {
		var t = engine;
		if (!t.doCatchKeyboard || !t.editor)
			return;
			
		var _key = _evt.keyCode;
		t.key = _key;
		console.log("KEYPRESS: " + t.key + " at time:" + t.time);

		switch (_key) {		
			case 16 : t.shiftDown = true; break;
			case 17 : t.ctrlDown = true; break;	// PC
			case 91 : t.ctrlDown = true; break; // MAC cmd key
			case 32 : // spacebar
				t.switchPause(false);
				_evt.preventDefault();
			break;
			default : break;
		}
		
		if (t.editor.onKey(_key))
			_evt.preventDefault();
		else if (t.paused) {
			if (t.checkKeypressWhenPaused(_key))
				_evt.preventDefault();
		}
			
		
	   if (t.editor.shown && _evt.keyCode == 8) { // prevent backspace from navigating to prev page while editing
            var d = _evt.srcElement || _evt.target;
            switch (d.tagName.toUpperCase()) {
                case 'TEXTAREA':
                    break;
                case 'INPUT':
                    break;
                case 'DIV':
                    break;
                default:
					_evt.preventDefault();
                break;
            }
        }
			
	},

	keyUp : function(_evt) {
		var t = engine;
		var _key = _evt.keyCode;

		switch (_key) {		
			case 16 : t.shiftDown = false; break;
			case 17 : t.ctrlDown = false; break; // PC
			case 91 : t.ctrlDown = false; break; // MAC cmd key
			default : break;
		}		
	},

	/**
		Updates demo effects and renders the scene
	**/
	render : function() {
		var t = this;
		var gl = t.gl;

		for (var i = 0; i < t.contexts.length; i++)		
		{
		    if (i != webgl_2d_frontSprites) {
		        t.pushContext(i);
		        t.resizeCanvas();
		        t.popContext();
		    }
		}

		t.deltaTime = t.time - t.lastTime;
		t.lowFrameRateCounter = Math.max(t.lowFrameRateCounter, 0.0);
		if (t.autoFrameRate && t.deltaTime > 1.0/30.0)
			t.lowFrameRateCounter += t.deltaTime;
		else
			t.lowFrameRateCounter -= t.deltaTime;
		
		if (t.lowFrameRateCounter <= 0.0 && t.autoFrameRateTex != null) {
			t.timeWithGoodFrameRate += t.deltaTime;
			//console.log("timeWithGoodFrameRate: " + t.timeWithGoodFrameRate);
		}
		else
			t.timeWithGoodFrameRate = Math.max(0.0, t.timeWithGoodFrameRate-t.deltaTime);
			
		t.handleLOD();
			
		t.lastTime = t.time;

		if (null != t.globalUpdate)
			t.globalUpdate(t.time, t.deltaTime, t.click);
		else if (null != t.defaultUpdate)
			t.defaultUpdate(t.time, t.deltaTime, t.click);
		
		t.click = false;
		t.key = 0;
	},

	handleLOD : function(){
		var t = this;
//				t.autoFrameRateTex = t.lodTex[0];
		
		if (t.forceLODTimer > 0.0) {
			if (!t.autoFrameRateTex) {
				t.autoFrameRateTex = t.lodTex[0];
				console.log("FORCE SWITCHING TO LOD 1");
			}
			t.forceLODTimer -= t.deltaTime;
			if (t.forceLODTimer <= 0.0) {
				t.autoFrameRateTex = t.LODBeforeForce;
				t.lowFrameRateCounter = 0.0;
				t.timeWithGoodFrameRate = 0.0;
			}			
		} else if (t.lowFrameRateCounter > 2.0) {
			t.lowFrameRateCounter = 0;
			if (!t.autoFrameRateTex) {
				t.autoFrameRateTex = t.lodTex[0];
				console.log("SWITCHING TO LOD 1");
			}
			else if (t.autoFrameRateTex == t.lodTex[0]) {
				t.autoFrameRateTex = t.lodTex[1];
				console.log("SWITCHING TO LOD 2");
			}
		}
	/*	
		if (t.timeWithGoodFrameRate > 10.0) {
			if (t.autoFrameRateTex == t.lodTex[1]) {
				t.autoFrameRateTex = t.lodTex[0];
				console.log("SWITCHING BACK TO LOD 1");
			}
			else if (t.autoFrameRateTex == t.lodTex[0]) {
				t.autoFrameRateTex = null;
				console.log("SWITCHING BACK TO NO LOD");
			}
			t.timeWithGoodFrameRate = 0.0;
		}
		*/
		if (t.lastLODRefWidth == window.innerWidth && t.lastLODRefHeight == window.innerHeight)
			return;
	
		console.log("REALLOC LOD TEXTURES");
		t.pushContext(webgl_2d_raymarch);
			t.lastLODRefWidth = window.innerWidth;
			t.lastLODRefHeight = window.innerHeight;
			t.lodTex[0].context.deleteTexture(t.lodTex[0].texture);
			t.lodTex[1].context.deleteTexture(t.lodTex[1].texture);
			t.lodTex[0].createRenderTexture(t.gl, Math.floor(window.innerWidth * LOD_level_1), Math.floor(window.innerHeight * LOD_level_1), {wrap : engine.gl.CLAMP_TO_EDGE});
			t.lodTex[1].createRenderTexture(t.gl, Math.floor(window.innerWidth * LOD_level_2), Math.floor(window.innerHeight * LOD_level_2), {wrap : engine.gl.CLAMP_TO_EDGE});
			t.autoFrameRateTex = null;
			t.timeWithGoodFrameRate = 0.0;
			t.lowFrameRateCounter = 0;
		t.popContext(webgl_2d_raymarch);			
	},
	
	/**
		Internal, called by render
	**/
	resizeCanvas : function() {
		var t = this;
		var gl = t.gl;
		
		if (gl.canvas.width == window.innerWidth && gl.canvas.height == window.innerHeight) {
			return;
		}
		
		t.frontCanvas.width = window.innerWidth;
		t.frontCanvas.height = window.innerHeight;
		t.canvases[webgl_2d_frontSprites].width = window.innerWidth;
		t.canvases[webgl_2d_frontSprites].height = window.innerHeight;
		t.frontContext.font = (50 * window.innerWidth / 800).toString() + "px JSGL";
					
		gl.canvas.left = (window.innerWidth - window.innerWidth * t.scaleGL) * 1.0;
		gl.canvas.top = (window.innerHeight - window.innerHeight * t.scaleGL) * 1.0;
		gl.canvas.height = window.innerHeight * t.scaleGL;
		gl.canvas.width = window.innerWidth * t.scaleGL;
		gl.canvas.height = window.innerHeight * t.scaleGL;
		gl.viewport(gl.canvas.left, 0, t.canvas.width * t.scaleGL, t.canvas.height * t.scaleGL);
		if (null != t.currenProgram)
			gl.uniform3fv(t.currentProgram.iResolution, [t.canvas.width * t.scaleGL, t.canvas.height * t.scaleGL, 1.0]);
		t.savedViewport = null;
	},

	/**
		Assigns a texture to a channel
		@param texture	the texture
		@param channel	the channel index
	**/
	setTexture : function(texture, channel, isOptional) {
		var t = this;
		if (!texture)
			return;	// happens, be cool with the editor
		var gl = t.gl;

		switch (channel) {
			case 0:
				gl.activeTexture(gl.TEXTURE0);
			break;
			case 1:
				gl.activeTexture(gl.TEXTURE1);
			break;
			case 2:
				gl.activeTexture(gl.TEXTURE2);
			break;
			case 3:
				gl.activeTexture(gl.TEXTURE3);
			break;
			case 4:
				gl.activeTexture(gl.TEXTURE4);
			break;
			case 5:
				gl.activeTexture(gl.TEXTURE5);
			break;
			case 6:
				gl.activeTexture(gl.TEXTURE6);
			break;
			case 7:
				gl.activeTexture(gl.TEXTURE7);
			break;
			default:
				t.error("engine.setTexture() failed!");
			break;
		}
			
		gl.bindTexture(gl.TEXTURE_2D, texture.texture);
		if (null != t.currentProgram) {
			if (t.currentProgram.context != gl)
				t.error("engine::setTexture --> Program belongs to context " + t.currentProgram.context.canvas.id + " while current context is " + gl.canvas.id);
			switch (channel) {
				case 0:
				    if (t.currentProgram.sampler0Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler0");
					gl.uniform1i(t.currentProgram.sampler0Uniform, channel);
				break;
				case 1:
				    if (t.currentProgram.sampler1Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler1");
					gl.uniform1i(t.currentProgram.sampler1Uniform, channel);
				break;
				case 2:
				    if (t.currentProgram.sampler2Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler2");
					gl.uniform1i(t.currentProgram.sampler2Uniform, channel);
				break;
				case 3:
				    if (t.currentProgram.sampler3Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler3");
					gl.uniform1i(t.currentProgram.sampler3Uniform, channel);
				break;
				case 4:
				    if (t.currentProgram.sampler4Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler4");
					gl.uniform1i(t.currentProgram.sampler4Uniform, channel);
				break;
				case 5:
					if (t.currentProgram.sampler5Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler5");
					gl.uniform1i(t.currentProgram.sampler5Uniform, channel);
				break;
				case 6:
					if (t.currentProgram.sampler6Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler6");
					gl.uniform1i(t.currentProgram.sampler6Uniform, channel);
				break;
				case 7:
					if (t.currentProgram.sampler7Uniform == null && !isOptional)
						t.error("engine.setTexture(): Current program doesn't have uniform uSampler7");
					gl.uniform1i(t.currentProgram.sampler7Uniform, channel);
				break;
				default:
					t.error("engine.setTexture() failed: No such uniform");
				break;
			}
		}
	},
	
	enterRenderTexture : function(texture, _clear) {
		var t = this;
		var gl = t.gl;

		if (t.savedViewport === null)
			t.savedViewport = gl.getParameter(gl.VIEWPORT);
		
		t.framebuffer[t.curContextIndex] = t.framebuffer[t.curContextIndex] || gl.createFramebuffer();
		t.renderbuffer[t.curContextIndex] = t.renderbuffer[t.curContextIndex] || gl.createRenderbuffer();
		gl.bindFramebuffer(gl.FRAMEBUFFER, t.framebuffer[t.curContextIndex]);
		gl.bindRenderbuffer(gl.RENDERBUFFER, t.renderbuffer[t.curContextIndex]);
		if (texture.width != t.renderbuffer[t.curContextIndex].width || texture.height != t.renderbuffer[t.curContextIndex].height) {
		  t.renderbuffer[t.curContextIndex].width = texture.width;
		  t.renderbuffer[t.curContextIndex].height = texture.height;
		  gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, texture.width, texture.height);
		}
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture.texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, t.renderbuffer[t.curContextIndex]);
		gl.viewport(0, 0, texture.width, texture.height);
		if (_clear) {
			gl.clearColor(0, 0, 0, 1);
			gl.clear(t.gl.COLOR_BUFFER_BIT | t.gl.DEPTH_BUFFER_BIT);
		}
	},
	
	exitRenderTexture : function() {
		var t = this;
		var gl = t.gl;
		var v = t.savedViewport;
		
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		gl.viewport(v[0], v[1], v[2], v[3]);
	},
	
	saveServerFile : function(_name, _data) {
		if (!SHOW_ERRORS)
			return;
		var data = new FormData();
		data.append("name" , _name);
		data.append("data" , _data);
		var xhr = (window.XMLHttpRequest) ? new XMLHttpRequest() : new activeXObject("Microsoft.XMLHTTP");
		xhr.open( 'post', 'createfile.php', true );
		xhr.send(data);
	},

	startErrorSystem : function() {
		if (!SHOW_ERRORS)
			return;
		var data = new FormData();
		var xhr = (window.XMLHttpRequest) ? new XMLHttpRequest() : new activeXObject("Microsoft.XMLHTTP");
		xhr.open( 'post', 'debug/initerror.php', true );
		xhr.send(data);
	},
	
	initMouse : function() {
		var t = this;
		t.isMouseDown = false;
		t.mousePos = [0,0];
		t.mouseWhenClicked = [0,0];
		t.mouseDelta = [0,0];
		var canvas = t.canvases[webgl_2d_raymarch];
		document.body.addEventListener("mousedown", function(event) {
			t.isMouseDown = true;
			t.mousePos = [event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop];
			t.mouseWhenClicked = [event.pageX - canvas.offsetLeft, event.pageY - canvas.offsetTop];
			t.mouseDelta = [0,0];
		}, false);
		document.body.addEventListener("mousemove", function(event) {
			if (t.isMouseDown) {
				var x = event.pageX - canvas.offsetLeft;
				var y = event.pageY - canvas.offsetTop;
				t.mouseDelta = [x-t.mouseWhenClicked[0], -(y-t.mouseWhenClicked[1])];
//				t.mouseDelta = [x-t.mousePos[0], -(y-t.mousePos[1])];
				t.mousePos = [x, y];
			}
		}, false);
		document.body.addEventListener("mouseup", function(event) {
			t.isMouseDown = false;
			t.mouseDelta = [0,0];
		}, false);
		document.body.addEventListener("mouseout", function(event) {
			t.isMouseDown = false;
			t.mouseDelta = [0,0];
		}, false);
	}
}
