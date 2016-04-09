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

ALL_PARAMS = {};
PARAMSLIST = [
	{ container : "ALL_PARAMS", directValue :  "{}"},	
	{ container : "ALL_PARAMS.GLOBAL", directValue :  "{}"},
];


function setDocVal(id, val) {
    var elem = document.getElementById(id);
    if (!elem) return null;
	return elem.value = val;
}

function buildAllParams(){
    var elem = document.getElementById("singleFX");
    if (!elem) return;
	ALL_PARAMS.GLOBAL.fxlist = elem.options[elem.selectedIndex].value;
	ALL_PARAMS.GLOBAL.useDefaultGlow = elem.options[elem.selectedIndex].getAttribute('data-defaultglow') == "1" ? true : false;
	ALL_PARAMS.GLOBAL.singleFXName = elem.options[elem.selectedIndex].getAttribute('data-fx');
	ALL_PARAMS.GLOBAL.fxlistIndex = elem.selectedIndex;
}

function applyLoadedParams() {
	buildMissingParams();
		
	// GLOBAL
	var elem = document.getElementById("singleFX");
	if (!elem) return;
	elem.selectedIndex = ALL_PARAMS.GLOBAL.fxlistIndex;
	refreshConfigFromID('jsoncontents', false);
//	setDocVal("uploaded_config", ALL_PARAMS.GLOBAL.onlineConfig);
}

function isNull (a) {
	return (a === undefined || a === null);
}

function buildMissingParams() {
	//console.log(">>>>>>>> BUILD MISSING PARAMS");
	var container = "";
	var cmd = "";
	var param = "";
	for (var  i = 0; i < PARAMSLIST.length; i++) {
		var p = PARAMSLIST[i];
		if (p.container) {
			container = p.container;
			param = p.container;
		} else if (p.param) {
			param = container + "." + p.param;
		}
		if (p.directValue) {
			cmd = "if (isNull(" + param + ")) " + param + " = " + p.directValue + ";";
		//	console.log(cmd);
			eval(cmd);
		}
		if (p.strValue) {
			cmd = "if (isNull(" + param + ")) " + param + " = '" + p.strValue + "';";
		//	console.log(cmd);
			eval(cmd);
		}
		if (p.exec) {
			cmd = p.exec;
		//	console.log(cmd);
			eval(p.exec);
		}
	}
}

function resetParams(saveit) {
	if (saveit)
		console.log("resetParams(true) - Clear ALL_PARAMS and save to localStorage");
	else
		console.log("resetParams(false) - Clear ALL_PARAMS but don't save to localStorage");
		
	ALL_PARAMS = {};
	buildMissingParams();
	if (saveit) {
		var jsonstring = JSON.stringify(ALL_PARAMS, null, 4);
		localStorage.setItem("LAST_PARAMS", jsonstring);
	}
	applyLoadedParams();
}

function onPageLoaded() {
	console.log("onPageLoaded() - reset params and load localStorage");
	resetParams(false);
	var storagedata	= localStorage.getItem('LAST_PARAMS');
	if (storagedata) {
		console.log(storagedata);
		 eval("ALL_PARAMS = " + storagedata);
		applyLoadedParams();
	}		
}

 function loadParams(evt) {
	console.log("loadParams() - fill ALL_PARAMS with config json file");
    var f = evt.target.files[0]; 

    if (f) {
      var r = new FileReader();
      r.onload = function(e) { 
	      var contents = e.target.result;
		 eval("ALL_PARAMS = " + contents);
		applyLoadedParams();
      }
      r.readAsText(f);
    } else { 
      engine.error("Failed to load params file");
    }
  }

function refreshConfigFromID(id, save) {
	var jsonstring = JSON.stringify(ALL_PARAMS, null, 4);
	setDocVal(id, jsonstring);
	if (save)
		localStorage.setItem("LAST_PARAMS", jsonstring);
}
 function applyConfigFromID(id) {
	var oname = getDocValStr (id);
	eval("ALL_PARAMS = " + oname);
	applyLoadedParams();
	var jsonstring = JSON.stringify(ALL_PARAMS, null, 4);
	localStorage.setItem("LAST_PARAMS", jsonstring);	
}

  function loadOnlineConfig(id) {
	var oname = getDocValStr (id);
	var fname = "trydata/"+oname;
	var request = new XMLHttpRequest();
	request.rurl = oname;
	request.open('GET', fname, false);
	request.setRequestHeader('Cache-Control', 'no-cache');
	request.onreadystatechange = function () {
		if (this.readyState == 4) {
			eval("ALL_PARAMS = " + this.responseText);
			setDocVal("jsoncontents", this.responseText);
			ALL_PARAMS.GLOBAL.onlineConfig = this.rurl;
			applyLoadedParams();
			var jsonstring = JSON.stringify(ALL_PARAMS, null, 4);
			localStorage.setItem("LAST_PARAMS", jsonstring);	
		}
	};
	var hasError = false;
	var errorStr = "";
	try {
		request.send(null);
	} catch (e) {
		hasError = true;
		errorStr = e.toString();
	}
	if (request.status === 404)
		hasError = true;
		errorStr = "404 error";
	if (hasError)
		engine.error("Error loading file:\n" + fname + "\n" + errorStr + "\nMake sure file exists");
  }
  
function saveParams(filename){
	console.log("saveParams() - call buildAllParams() and save them to localStorage and .json config file");
	buildAllParams();
	var jsonstring = JSON.stringify(ALL_PARAMS, null, 4);
	var blob = new Blob([jsonstring], {type: "text/plain;charset=utf-8"});
	saveAs(blob, filename);

	localStorage.setItem("LAST_PARAMS", jsonstring);	
}



