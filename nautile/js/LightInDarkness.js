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

MUSIC = true;
USE_MUSIC = true;
BOOTBLOCK_MIN_DURATION = -10.0;
LOADING_MIN_DURATION = 0.0;
HIDETEXT = true;
COMPILED = false;
FULL_DEMO = true;
RECORD_VIDEO_SYNCHROMUSIC = false;

var engine = new Engine(fxDemoUpdate);

var resman = new ResourceManager();
var fx;

// Demo variables
var fxBoot;
var fxLoading;
var fxDemo;

var curFXIndex = 0;
var prevFXIndex = 0;
var lastSwitchTime = 0.0;
var justChangedFxList = true;
var fx;
var beatHandler = null;

var LID_justLaunched;
var LID_fxCreated;
var LID_loadingScreenLoaded;
var LID_mainScreensPrefetched;
var LID_mainScreensCreated;

function createFxLists() {
/*
	Syntax:
	=======
		Special commands:
		----------------
			forceTime : Forces current time. Useful to jump in the middle of the list to test a specific fx. example: {forceTime: 6.0}
			forever : Never gets next Fx to execute. Useful to test a fx for an infinite duration. Must be placed AFTER the fx to test. example: {forever: true}
			shift: Shifts the "at" time of all following FX					
*/

	
    fxLoading = [{ at: 0.0000, fx: new LoadingBar(), name: "LoadingBar", update: fxLoadingUpdate }];
    if (!FULL_DEMO) {
        var startBefore = 0.5;
        var name = ALL_PARAMS.GLOBAL.singleFXName;
        if (name == "SeaTrees") STARTIME = 88.0 - startBefore;
        else if (name == "Haze") STARTIME = 120.0 - startBefore;
        else if (name == "CausticCity") STARTIME = 39.5 - startBefore;
        else if (name == "Corail") STARTIME = 152.0 - startBefore;
    }
    FULL_DEMO = true;
    if (FULL_DEMO) {
        fxDemo = [
            { at: 0.0, fx: new RaymarchFxSuite("t.lst = [{fx: new Ocean(ALL_PARAMS.OCEAN), depth: 1000.0}];", true), name: "Ocean", forceTime: STARTIME },
            { at: 39.5, fx: new RaymarchFxSuite("t.lst = [{fx: new CausticCity(ALL_PARAMS.CAUSTICCITY), depth: 1000.0}];", false), name: "CausticCity" },
            { at: 88.0, fx: new RaymarchFxSuite("t.lst = [{fx: new SeaTrees(ALL_PARAMS.SEATREES), depth: 1000.0}];", true), name: "SeaTrees" },
            { at: 120.0, fx: new RaymarchFxSuite("t.lst = [{fx: new Haze(ALL_PARAMS.HAZE), depth: 1000.0}];", true), name: "Haze" },
            { at: 152.0, fx: new RaymarchFxSuite("t.lst = [{fx: new Corail(ALL_PARAMS.CORAIL), depth: 1000.0}];", false), name: "Corail" },
 		    { at: 11100.0, forever: true }
        ];
    } else {
        fxDemo = [
            { at: 0.0, fx: new RaymarchFxSuite(ALL_PARAMS.GLOBAL.fxlist, ALL_PARAMS.GLOBAL.useDefaultGlow), name: "RaymarchFxSuite" },
		    { at: 100.0, forever: true }
        ];
    }
}

function prefetchFXscripts() {
    return;
    /*
	if (COMPILED)
		return;
	var async = true;
	var load = "normal";	
//	var load = "optimized";
//	var load = "compressed";
	var level1Files = [
	];
	var filesList = [		
		// load fx scripts
];

	for (var i = 0; i < filesList.length; i++) {
		var jsPath;
		var fname = filesList[i];
		if (load == "normal") {
			jsPath = "js/";
			fname += ".js";
		} else if (load == "optimized") {
			jsPath = "baked/js/optim/";
			fname += ".js_o";
		} else if (load == "compressed") {
			jsPath = "baked/js/lzw/";
			fname += ".js_c";
		}
		jsLoader_load([jsPath + fname], async);
	}
    */
}

function forceTime(time) {
	engine.forceTime(time);
	console.log("forced time to: " + time);
}

function launchNewFxList(list, playmusic) {
	if (!list.alreadyCreated) {					
		createAllFX(list);	// do it here, not before, to avoid gl context scrambling		
		list.alreadyCreated = true;
	}
	engine.justLaunched = true;
	engine.globalUpdate = list[0].update;
	if (!list[0].forceTime) list[0].forceTime = 0.0;
	if (list[0].forceTime != null)
	{
		var timeset = list[0].forceTime;
		if (timeset < 5.0)	// avoid stupid epsilons
			timeset = 0.0;
		if (AudioElem.musicStartTime && AudioElem.musicStartTime > 0)
			timeset = AudioElem.musicStartTime;
		forceTime(timeset);
		if (playmusic) {
			engine.music = AudioElem;
			engine.music.pause();
			engine.music.loop = true;
			engine.music.currentTime = timeset;
			if (engine.music.paused) {
			    if (RECORD_VIDEO_SYNCHROMUSIC)
			        engine.startRecordVideo();
			    engine.music.play();
            }
        }
		
		if (!beatHandler) {
			beatHandler = new BeatHandler();
			beatHandler.setBPM(125.0);
		}
		else
			beatHandler.reset(timeset);
		
	}
	fx = list;
	curFXIndex = 0;
}


function is_jsloader_ready() {
    if (typeof jsLoader_loaded != "undefined")
        return jsLoader_isReady();
    return true;
}

function fxBootUpdate(time, deltaTime) {
	if (LID_justLaunched) {	// first update
		LID_justLaunched = false;
		LID_fxCreated = false;
		forceTime(0.0);
		LID_loadingScreenLoaded = false;
		LID_mainScreensPrefetched = false;
		LID_mainScreensCreated = false;
	}
		
	if (LID_fxCreated) {	// fx has been created
		update(time, deltaTime, false);
		
		if (!LID_loadingScreenLoaded) {
		    if (resman.isReady() && is_jsloader_ready() && paramsLoader_isReady()) {
				LID_loadingScreenLoaded = true;
			}
		}
		else {
			if (!LID_mainScreensPrefetched) {
				prefetchAllResources(fxDemo);
				LID_mainScreensPrefetched = true;
			}
			launchNewFxList(fxLoading, false);
		}
	}
	else {
	    if (resman.isReady() && is_jsloader_ready() && paramsLoader_isReady()) {	// resources are ready
			// launch fx
			createFxLists();			
			createAllFX(fxBoot);
			LID_fxCreated = true;
			// prefetch loading screen
			prefetchAllResources(fxLoading);
		}
	}
}

function fxLoadingUpdate(time, deltaTime) {
	if (LID_justLaunched) {	// first update
		LID_justLaunched = false;
		forceTime(0.0);
	}
	
	update(engine.time, deltaTime, false);
	
	if (!LID_mainScreensCreated) {
	    if (resman.isReady() && is_jsloader_ready() && engine.fontLoaded && paramsLoader_isReady()) {
			if (AudioIsLoaded)
				LID_mainScreensCreated = true;
			else
				console.log("Waiting for audio to load... : " + AudioElem.src);
		}
	}
	else {
			launchNewFxList(fxDemo, true);
	}
}

function fxDemoUpdate(time, deltaTime, click) {
	if (LID_justLaunched) {	// first update
		LID_justLaunched = false;
		forceTime(0.0);
	}
	if (beatHandler) {
		beatHandler.getData(engine.time-deltaTime, engine.time);
	}
	update(engine.time, deltaTime, click);
}

function fxDemoLoop(time, deltaTime) {
	launchNewFxList(fxDemo);
}

function getNextFXIndex(idx) {
	return (idx+1) % fx.length;
}
function goToNextFX() {
	prevFXIndex = curFXIndex;
	curFXIndex = getNextFXIndex(curFXIndex);
	if (fx[curFXIndex].JumpToIndex)
		curFXIndex = fx[curFXIndex].JumpToIndex;
	
	console.log("new FX index: " + curFXIndex);
}

function getNextRealFX() {
	var i = getNextFXIndex(curFXIndex);
	while (!fx[i].fx) {
		i = getNextFXIndex(i);
	};
	return fx[i];
}

function switchFX(time) {
	var skipThisFX = false;
	switch (curFXIndex) {
	default:
		if (fx[curFXIndex].forceTime != null) {
			time = fx[curFXIndex].forceTime;
			engine.forceTime(time);
			console.log("forced time to: " + time);
		}
		console.log("switching to fx \"" + fx[curFXIndex].name + "\" at time: " +  time);
		console.log("next fx: \"" + getNextRealFX().name + "\" at time: " +  getNextRealFX().at);
		engine.globalUpdate = fx[curFXIndex].update;
		if (engine.forceLODTimer <= 0.0) {
			engine.autoFrameRateTex = null;
			engine.lowFrameRateCounter = 0.0;			
			engine.timeWithGoodFrameRate = 0.0;
		}
	break;
	}
	return time;
}

var initDone = false;


function prefetchAllResources(_fx) {
	for (var i = 0; i < _fx.length; i++) {
		if (null != _fx[i].fx && null != _fx[i].fx.preloadResources)
			_fx[i].fx.preloadResources();
	}
}

function createAllFX(_fx) {
	var lastAt = -1.0;
	for (var i = 0; i < _fx.length; i++) {
		var deletei = false;
		if (_fx[i].forever) {	// simply shift all others
			for (var it = i+1; it < _fx.length; it++) {
				if(_fx[it].at)
					_fx[it].at += 99999999;
				if(_fx[it].atBar)
					_fx[it].atBar += 99999999;
			}
			if (!_fx[i].fx && _fx[i].at) // shift self if no fx to stay on previous fx
				_fx[i].at += 99999999;
			deletei = true;
		}		
		if (_fx[i].shift) {
			for (var it = i+1; it < _fx.length; it++) {
				if(_fx[it].at)
					_fx[it].at += _fx[i].shift;
			}
			deletei = true;
		}
		if (deletei) {
			_fx.splice(i, 1);
			i--;
		}
	}
	for (var i = 0; i < _fx.length; i++) {
		if (null != _fx[i].fx)
			_fx[i].fx.createFX(engine.gl, HIDETEXT);
	}
}

var lastTickFx = null;
function  update(time, deltaTime, click) {
	if (!fx)
		return;	// not yet initialized
	var nextTime;
	var nfx = getNextRealFX();
	if (nfx.at)
		nextTime = nfx.at;
	if (nfx.atBar)
		nextTime = beatHandler.lastBarTime + (nfx.atBar - beatHandler.lastBarIndex) * beatHandler.secondsForOneBar;
		
	if (fx[curFXIndex].fx) {
		if (fx[curFXIndex].fx != lastTickFx) {
			if (null != lastTickFx) {
				if (lastTickFx.exit) {
					lastTickFx.exit(engine.gl);
					if (engine.text2d.hijacked)
						engine.error("engine.text2d.hijacked still ON after exiting");
				}
			}
			if (fx[curFXIndex].fx.enter)
				fx[curFXIndex].fx.enter(lastTickFx);
			lastTickFx = fx[curFXIndex].fx;
		}
		engine.VerifyContextStackDepth();
		if (fx[curFXIndex].fx.tick) {
			var remaining = nextTime-time;
			if (engine.click && !engine.paused) {
				if ((!fx[curFXIndex].fx.onUserClick || !fx[curFXIndex].fx.onUserClick()) && (remaining > 2.0)) {
					time = nextTime - 2.0;
					engine.time = time;
					engine.music.pause();
					engine.music.currentTime = time;
					engine.music.play();
					if (RECORD_VIDEO_SYNCHROMUSIC)
					    engine.startRecordVideo();
					beatHandler.reset(time);
				}
			}
			fx[curFXIndex].fx.tick(time, engine.gl, remaining);
		}
		engine.VerifyContextStackDepth();
	}
		
	if (time >= nextTime) {		
		goToNextFX();
		time = switchFX(time);
		lastSwitchTime = time;
	}		
}

AudioIsLoaded = false;
AudioElem = new Audio();
AudioStartTime = 0;
AudioElem.src = "data/nautile9.mp3";

AudioElem.addEventListener('loadeddata', function() 
{
    AudioIsLoaded = true;
    console.log("AUDIO IS LOADED : " + AudioElem.src);
}, false);
 
AudioElem.addEventListener('error' , function() 
{
    engine.error('error loading audio: ' + AudioElem.src);
}, false);
 

function demoInit(_fullDemo, _recordVideo) {
    FULL_DEMO = _fullDemo;
    RECORD_VIDEO_SYNCHROMUSIC = _recordVideo;
    //engine.init(30.0, null); // 
    var idx = 0;
    var elem = document.getElementById("singleFX");
    if (elem)
        idx = elem.selectedIndex;

	var params = null;
	/*
	switch(idx) {
		case 0 : {MUSIC = false; break;}
		case 1 : {params = ALL_PARAMS.FOREST.commonParams; break;}
		case 2 : {params = ALL_PARAMS.SEATREES.commonParams; break;}
		case 3 : {params = ALL_PARAMS.SEATREES2.commonParams; break;}
		case 4 : {params = ALL_PARAMS.HAZE.commonParams; break;}
		case 5 : {params = ALL_PARAMS.UNDERSEA.commonParams; break;}
		case 6 : {params = ALL_PARAMS.SEA.commonParams; break;}
		case 7 : {params = ALL_PARAMS.STARS.commonParams; break;}
		case 8 : {params = ALL_PARAMS.CAUSTICCITY.commonParams; break;}
		case 8 : {params = ALL_PARAMS.OCEAN.commonParams; break;}
		default : alert("demoInit() : FX not taken into account for music, but will run anyways"); break;
	}*/
	var musicok = false;
    mus = "data/nautile9.mp3";
	if (mus) {
		MUSIC = true;
		USE_MUSIC = true;
		AudioIsLoaded = false;
		AudioElem.src = mus;
		engine.music = AudioElem;
		if (params && params.Music && params.Music.startTime)
			AudioElem.musicStartTime = params.Music.startTime;
		musicok = true;
	}
	if (!musicok) {
		MUSIC = false;
		AudioIsLoaded = true;
	}
	
	engine.init(30.0, document.getElementById("music"));
	buildAllParams();
	var jsonstring = JSON.stringify(ALL_PARAMS);
	localStorage.setItem("LAST_PARAMS", jsonstring);	
	
	fxBoot = [{at: 0.0000, fx: new BootBlock(), update: fxBootUpdate}];
 	
	fx = fxBoot;
	prefetchAllResources(fxBoot);
	prefetchFXscripts();
	engine.justLaunched = true;
	engine.globalUpdate = fxBoot[0].update;
	paramsLoader_loadAll();
}
