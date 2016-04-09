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

function getParam(index) {
	return engine.editor.editedFX.hlp.interp.list[index];
} 

function Editor() {
	var t = this;
	t.shown = false;					// is the editor currently displayed on screen	
	t.HTMLCode = "";					// HTML string that forms the editor
	t.editedFX = null;					// currently edited FX
	t.entries = [];						// all values that can be edited
	t.editCamera = false;
	t.cameraPosInterpolator = null;
	t.cameraRotInterpolator = null;
	t.curCamKeyframeIndex = 0;
	t.camOffset = [0.0,0.0,0.0];
	t.camRotOffset = [0.0,0.0,0.0];
	t.undoredo = [];
	t.undoredoIndex = -1;
	t.undoredoLastIndex = -1;
	t.memory = ["","","",""];
	t.helpVisible = false;
	t.camLockPos = [];
	t.camLockRot = [];
	t.lockCam = false;
	t.resetEditorVariables();
	t.refreshTexTab = false;
	t.curTab = "params";
	t.hasTimeControl = true;
	localStorage.setItem("TC", 1); // Editor has tome control
	var d = new Date();
	t.editorTimeStamp = d.getTime();
	localStorage.setItem("A", t.editorTimeStamp);
	var Sfdbk = localStorage.getItem("B");
	if (Sfdbk)
		t.feedbackTimeStamp = parseInt(Sfdbk);
	else
		t.feedbackTimeStamp = -1;


	t.changedSetting  = true;
	if (window.File && window.FileReader && window.FileList && window.Blob) {
	} else {
		alert("The File APIs are not fully supported in this browser. Some editor functions won't work");
	}	
 }

Editor.prototype = {

	addButton: function (name, onclick) {
		var t = this;
		t.HTMLCode += "<button onclick='"+onclick+"'style='font-family:JSGL;'>"+name+"</button>";
	},

	resetEditorVariables: function() {
		var t = this;
		t.isParamFolded = [];
		t.watched = -1;
		t.isParamFolded = [];
		t.showHideParam = -1;
		t.watched = -1;
		t.insideColorPicker = false;
		t.colorChooserIndex = -1;
		t.colorChooserRef = null;
		t.copyPasteKeyf = null;
		t.lastModifiedKey = {curveIndex:-1, kefIndex:-1};
	},


	show: function() {
		var t = this;
		document.getElementById('editor').style.display='block';
		document.getElementById('status').style.display='block';
		document.getElementById('icon').style.display='block';
		document.getElementById('canvas_div').style.cursor='auto';
		t.shown = true;
		window.onbeforeunload = function () {
		  return "Leave while editing, really? Did you just press backspace while not inside a field?";
		}
	},

	hide: function() {
		var t = this;
		console.log("hide");
		document.getElementById('editor').style.display='none';
		document.getElementById('status').style.display='none';
		document.getElementById('icon').style.display='none';
		document.getElementById('canvas_div').style.cursor='none';
		t.shown = false;
		window.onbeforeunload  = function () {
		}
	},

	toggle: function() {
		var t = this;
		if (t.shown)
			t.hide();
		else
			t.show();
	},
	
	enterCamera: function() {
		var t = this;
		t.editCamera = true;
		t.status("Camera mode ON");
		t.camOffset = [0.0,0.0,0.0];
		document.getElementById('iconImg').src = "data/editor/cameraicon.png";
	},

	exitCamera: function() {
		var t = this;
		t.editCamera = false;
		t.status("Camera mode OFF");
		t.camOffset = [0.0,0.0,0.0];
		document.getElementById('iconImg').src = "data/editor/editicon.png";
	},

	toggleCamera: function() {
		var t = this;
		if (t.editCamera)
			t.exitCamera();
		else
			t.enterCamera();
	},


	status : function(message) {
		var t = this;
		t.statusMess = message;
		document.getElementById('status').innerHTML = t.statusMess;
	},
	
	undoRedoNewValue : function () {
		var t = this;		
		var _value = document.getElementById("editorjson").value;
		if (t.undoredoLastIndex >= 0 && t.undoredo[t.undoredoLastIndex] === _value)
			return;
		t.undoredoLastIndex++;
		if (t.undoredoLastIndex == t.undoredo.length)
			t.undoredo.push(_value);
		else
			t.undoredo[t.undoredoLastIndex] = _value;
		t.undoredoIndex = t.undoredoLastIndex;
	},

	undoRedoBackwards : function () {
		var t = this;
		var curtab = t.curTab;
		t.jumpToTab('params');
		t.undoredoIndex = Math.max(0.0, t.undoredoIndex-1);		
		document.getElementById('editorjson').value = t.undoredo[t.undoredoIndex];
		t.ApplyJSONEQ();
		t.status("undo (index :" + t.undoredoIndex + ")");
		t.jumpToTab(curtab);
	},


	undoRedoForward : function () {
		var t = this;
		var curtab = t.curTab;
		t.jumpToTab('params');
		t.undoredoIndex = Math.min(t.undoredo.length-1, t.undoredoIndex+1);
		
		document.getElementById('editorjson').value = t.undoredo[t.undoredoIndex];
		t.ApplyJSONEQ();
		t.status("redo (index :" + t.undoredoIndex + ")");
		t.jumpToTab(curtab);
	},
	
	
	getCamPos : function(pos) {
		var t = this;
		if (t.lockCam)
			return t.camLockPos;
		var ret = [0,0,0];
		ret[0] = pos[0]+t.camOffset[0];
		ret[1] = pos[1]+t.camOffset[1];
		ret[2] = pos[2]+t.camOffset[2];
		t.lastCamPos = ret;
		return ret;
	},
	
	getCamRot : function(rot) {
		var t = this;
		if (t.lockCam)
			return t.camLockRot;
		var ret = [0,0,0];
		ret[0] = rot[0]+t.camRotOffset[0];
		ret[1] = rot[1]+t.camRotOffset[1];
		ret[2] = rot[2]+t.camRotOffset[2];
		t.lastCamRot = ret;
		return ret;
	},
	
	statusCamOffset : function() {
		var t = this;		
		t.status("Cam offset: " + t.camOffset[0].toFixed(2) + ", " + t.camOffset[1].toFixed(2) + ", " + t.camOffset[2].toFixed(2));
	},
	
	handleMemory : function (_index) {
		var t = this;
		if (engine.ctrlDown){
			t.memory[_index] = document.getElementById("editorjson").value;
			t.status("Current setting recorded in memory slot " + (_index+1));
		}
		else if (engine.shiftDown) {
			if (t.memory.length <= _index || t.memory[_index].length < 5) {
				alert("Empty memory slot. User Ctrl+slot number to record");
				return;
			}
			document.getElementById('editorjson').value = t.memory[_index];
			t.ApplyJSONEQ();
			t.status("Memory slot " + (_index+1) + " applied");
		}
	},
	
	overWriteWatchedValue : function (_values) {
		var t = this;
		document.getElementById('editKeyf').style.display='none';
	},
	
	getWatchedCurve : function () {
		var t = this;
		if (t.watched >= 0) {
			var  curv = getParam(t.watched).curve;
			if (curv.data && curv.data.length > 0)
				return curv;
		}
		return null;
	},

	
	cancelColorPicker : function () {
		var t = this;
		t.insideColorPicker=false;
		document.getElementById('picker').style.display='none';
	},

	
	applyColorPicker : function (rgb, isfinal) {
		var t = this;
		var curv = t.getWatchedCurve();

		if (curv) {
			var valuesRef = t.colorChooserRef;
			valuesRef[0] = rgb.r/255.0;
			valuesRef[1] = rgb.g/255.0;
			valuesRef[2] = rgb.b/255.0;
			if (isfinal) {
				t.refreshJSONEQ();
				t.ApplyJSONEQ();
			}
			t.refreshFXRendering();
		}
		if (isfinal) {
			t.cancelColorPicker();
		}
	},
	
	chooseColor : function (_index, subindex, useAlpha) {
		var t = this;
		
		t.colorChooserIndex = _index;
		if (t.colorChooserIndex >= 0) {
			e = t.entries[t.colorChooserIndex];
			t.colorChooserRef = getParam(_index).curve.getKeyf(subindex).values
		} 
		var curv = t.getWatchedCurve();
		if (curv) {
			var dialog = document.getElementById('picker');
			var dlg = '<label for="background-color">'+curv.getName() +'</label>';
			dlg+="<div class='color-box'></div>";
			dialog.innerHTML = dlg;			
			dialog.style.display='block';
			$('.color-box').colpick({
				colorScheme:'dark',
				layout:'rgbhex',
				color: rgbToHexStr(t.colorChooserRef[0],t.colorChooserRef[1],t.colorChooserRef[2]),
				onSubmit:function(hsb,hex,rgb,el) {
					$(el).css('background-color', '#'+hex);
					$(el).colpickHide();
					engine.editor.applyColorPicker(rgb, true);
				},
				onChange:function(hsb,hex,rgb,el,bySetColor) {
					$(el).css('background-color', '#'+hex);
					if(!bySetColor) $(el).val(hex);
					engine.editor.applyColorPicker(rgb, false);
				}	
			})
			.css('background-color', rgbToHexStr(t.colorChooserRef[0],t.colorChooserRef[1],t.colorChooserRef[2]));
			t.insideColorPicker = true;
		}
		else alert("Make sure something is watched before choosing a color");
	},
		
	insertKeyframe : function (_offset) {
		var t = this;
		var dur;
		
		var curv = t.getWatchedCurve();
		if (curv) {
			var campos = t.getCamPos(t.editedFX.parent.campos);
			var camrot = t.getCamRot([t.editedFX.parent.camRoll, t.editedFX.parent.camPitch, 0]);
			var keyf = curv.getKeyf(curv.lastUpdatedKeyf);
			var dialog = document.getElementById('editKeyf');
			var dlg = "<center><b>"+curv.getName()+"<br>key:"+curv.lastUpdatedKeyf+"<hr>FROM</b><br>";
			for (var i = 0; i < keyf.value.length; i++) {
				var id = "editWatchFrom_" + i;
				dlg += "<input  onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true);' maxlength='6' size='6' type='text' id='" + id + "' value='" + keyf.value[i] + "'><br>";
			}
			dlg += "<br><b>TO</b><br>";
			for (var i = 0; i < keyf.to.length; i++) {
				var id = "editWatchTo_" + i;
				var value = keyf.to[i];
				if (curv.getName() === "camPos")
					value = campos[i].toFixed(2);
				if (curv.getName() === "camRot")
					value = camrot[i].toFixed(2);
				dlg += "<input  onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true);' maxlength='6' size='6' type='text' id='" + id + "' value='" + value + "'><br>";
			}
			dlg += "<br><button onclick='engine.editor.overWriteWatchedValue();' style='font-family:JSGL;'>Ok</button><br>";
			dlg += "</center><br>";
			dialog.innerHTML = dlg;
			dialog.style.display='block';
		}
		else alert("Make sure something is watched before inserting keyframes");
	},
	
	clearCamOffsets : function () {
		var t = this;
		t.camOffset[0] = 0;
		t.camOffset[1] = 0;
		t.camOffset[2] = 0;
		t.camRotOffset[0] = 0;
		t.camRotOffset[1] = 0;
		t.camRotOffset[2] = 0;
	},


	
	applyContent : function() {
		var t = this;
		document.getElementById('editor').innerHTML = t.HTMLCode;
	},
	
	priv_onArrayChanged : function (index) {
		var t = this;
		var e = t.entries[index];
		var elem = document.getElementById(e.id);
		var value = parseFloat(elem.value);
		getParam(e.curveIndex).curve.getKeyf(e.keyfIndex).values[e.valueIndex] = value;
		t.lastModifiedKey.curveIndex = e.curveIndex;
		t.lastModifiedKey.keyfIndex = e.keyfIndex;
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		if (!engine.isMouseDown) // avoid adding values when a slider is being dragged
			t.undoRedoNewValue();
	},


	priv_onFieldChanged : function (index) {
		var t = this;
		var e = t.entries[index];
		var value = parseFloat(document.getElementById(e.id).value);
		eval("getParam(e.curveIndex).curve.getKeyf(e.keyfIndex)."+e.iname+" = value;");
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		t.undoRedoNewValue();
	},
	
	
	priv_addArray: function(from, name, i, j, fieldname) {
		var t=this;
		for (var k = 0; k < from.length; k++) {
			var f = from[k];
			var tname = name + fieldname + k;
			var index = t.entries.length;
			t.entries[index] = {curveIndex:i, keyfIndex:j, valueIndex:k, iname:fieldname, id:tname};
			var str =  "<br><input maxlength='6' size='6' type='text' id='" + tname + "' value='" + f + "' onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true); engine.editor.priv_onArrayChanged("+index+");'>";
			t.HTMLCode += str;
			var incr = Math.abs(f);
			if (incr<0.1)
				incr = 1.0;			// minimum default range
			var rangemin = f-incr;
			var rangemax = f+incr;
			var ed = getParam(i).editor;
			if (ed) {
				if (typeof ed.min !== 'undefined') rangemin = ed.min;
				if (typeof ed.max !== 'undefined') rangemax = ed.max;
			}
			index = t.entries.length;
			tname += "_range";
			t.entries[index] = {curveIndex:i, keyfIndex:j, valueIndex:k, iname:fieldname, id:tname};
			if (rangemax<=rangemin)
				engine.error(name+": min = " + rangemin + ": max = " + rangemax + " --> min >= max!");
			f = (f-rangemin)*100.0/(rangemax-rangemin); // min..max range to 0..100 range
			t.HTMLCode += "<input type='range' onmouseup='engine.editor.key_SetValue("+index+",this.value, "+rangemin+", "+rangemax+", true);' oninput='engine.editor.key_SetValue("+index+",this.value, "+rangemin+", "+rangemax+", false);' onchange='engine.editor.key_SetValue("+index+",this.value, "+rangemin+", "+rangemax+", false);' onblur='engine.editor.key_SetValue("+index+",this.value, "+rangemin+", "+rangemax+", true);' min='0.0' max='100.0' step='0.01' value='"+f+"'>";
		/*	t.HTMLCode += "<button class='small blue' title='Decrease (slow)' onclick=\"engine.editor.key_IncrValue("+index+",0.9);\" ><i class='fa fa-backward'></i></button>";
			t.HTMLCode += "<button class='small blue' title='Increase (slow)' onclick=\"engine.editor.key_IncrValue("+index+",1.1);\" ><i class='fa fa-forward'></i></button>";
			t.HTMLCode += "<button class='small blue' title='Decrease (fast)' onclick=\"engine.editor.key_IncrValue("+index+",0.5);\" ><i class='fa fa-fast-backward'></i></button>";
			t.HTMLCode += "<button class='small blue' title='Increase (fast)' onclick=\"engine.editor.key_IncrValue("+index+",2.0);\" ><i class='fa fa-fast-forward'></i></button>";*/
		}
		t.HTMLCode += "<br>";
	},
	
	jumpToTab : function(name) {
		var t = this;		
		if (t.curTab === name)
			return;
		t.allowRefresh = true;
		t.curTab = name;
		if (name === 'params') {
			t.enterNewFX(t.editedFX, t.name, t.params);
		}
		else if (name === 'textures') {
			t.editFXTextures(t.editedFX, t.name, t.params);
		}		
		else if (name === 'sequence') {
			t.editSequence();
		}		
	},

	priv_addItem: function(from, name, i, j, fieldname) {
		var t=this;
		var k = 0;
		var f = from;
		var tname = name + fieldname + "_" + k;
		var index = t.entries.length;
		t.entries[index] = {curveIndex:i, keyfIndex:j, valueIndex:k, iname:fieldname, id:tname};
		var str =  "<input maxlength='6' size='6' type='text' id='" + tname + "' value='" + f + " 'onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true); engine.editor.priv_onFieldChanged("+index+");'>";
		t.HTMLCode += str;
		t.HTMLCode += "<br>";
	},

	priv_createStringArray : function(from) {
		var t=this;
		var ret = "[";
		for (var i = 0; i < from.length; i++) {
			ret += from[i].toFixed(2);
			if (i < from.length-1) {
				ret += ", ";
			}
		}
		ret += "],";
		return ret;
	},
	
	setWatched : function (_index, _force) {
		var t = this;
		if (!_force && t.watched === _index)
			t.watched = -1;
		else {
			t.watched = _index;
			var curv = t.getWatchedCurve();
			if (curv) {
				localStorage.setItem("CurveName", curv.getName());
				t.curCamKeyframeIndex = curv.lastUpdatedKeyf;
				var data = "allthefuck="+JSON.stringify(curv, null, 4);
				localStorage.setItem("ste_data", data);
				t.editorTimeStamp++; 	// change timestamp only after new data is written
				localStorage.setItem("A", t.editorTimeStamp);
			}
		}
	},



	checkCameraValues : function () {
		var t = this;
		if (t.cameraPosInterpolator.data.length != t.cameraRotInterpolator.data.length) {
			engine.error("WARNING! Camera pos and rot don't have the same keyframes count. This is gonna hurt.");
			return;
		}
		for (var i = 0; i < t.cameraPosInterpolator.data.length; i++) {
			if (t.cameraPosInterpolator.getKeyfTime(i) != t.cameraRotInterpolatorgetKeyfTime(i)) {
				engine.error("WARNING! Camera pos and rot keyframe #" + i + " don't have the same start time. This is gonna hurt.");
				return;
			}
		}
	},

	addTabs : function () {
		var t = this;
		t.HTMLCode += "<br><center>";
		t.HTMLCode += "<button title='Save' class='blue fa fa-save' onclick=\"engine.editor.saveParamsFile();\"></button>";
		if (t.curTab === 'params') {
			t.HTMLCode += "<button title='Show Parameters' class='grey fa fa-gear'></button>";
			t.HTMLCode += "<button title='Show Textures' class='blue fa fa-image' onclick=\"engine.editor.jumpToTab('textures');\"></button>";
			t.HTMLCode += "<button title='Sequence Editor' class='blue fa  fa-caret-square-o-right' onclick=\"engine.editor.jumpToTab('sequence');\"></button>";
		}
		else if (t.curTab === 'textures') {
			t.HTMLCode += "<button class='blue fa fa-gear' onclick=\"engine.editor.jumpToTab('params');\"></button>";
			t.HTMLCode += "<button class='grey fa fa-image'></button>";
			t.HTMLCode += "<button title='Sequence Editor' class='blue fa  fa-caret-square-o-right' onclick=\"engine.editor.jumpToTab('sequence');\"></button>";
		} else {
			t.HTMLCode += "<button title='Show Parameters' class='blue fa fa-gear' onclick=\"engine.editor.jumpToTab('params');\"></button>";
			t.HTMLCode += "<button title='Show Textures' class='blue fa fa-image' onclick=\"engine.editor.jumpToTab('textures');\"></button>";
			t.HTMLCode += "<button title='Sequence Editor' class='grey fa  fa-caret-square-o-right'></button>";
		}
		t.HTMLCode += "</center><br>";
	},

	refreshCurSettingName : function() {
		var t = this;
		var name = document.getElementById('curSettingName').value;
		if (t.editedFX.hlp.findSetting(name)) {
			alert("Dear Investor, stock market laws don't authorize settings with identical name");
			name += Math.random() * 1000;
		}
			
		t.editedFX.allParams.settings[t.editedFX.hlp.curSettingIndex].Setting_Name = name;
		t.refreshJSONEQ();
		t.ApplyJSONEQ();		
		t.undoRedoNewValue();
	},
	
	previousSetting : function() {
		var t = this;
		if (t.editedFX.hlp.curSettingIndex > 0)
			t.editedFX.hlp.curSettingIndex--;
		else
			t.editedFX.hlp.curSettingIndex = t.editedFX.allParams.settings.length-1;
		t.changedSetting  = true;
		t.ApplyJSONEQ();
	},

	nextSetting : function() {
		var t = this;
		if (t.editedFX.hlp.curSettingIndex < t.editedFX.allParams.settings.length-1)
			t.editedFX.hlp.curSettingIndex++;
		else
			t.editedFX.hlp.curSettingIndex = 0;
		t.changedSetting  = true;
		t.ApplyJSONEQ();
	},

	cloneSetting : function() {
		var t = this;
		document.getElementById('editorjson').value = t.priv_createStringFromData(t.name, t.editedFX.hlp.curSettingIndex);
		t.editedFX.hlp.curSettingIndex = t.editedFX.allParams.settings.length; // intentionl "overflow" so that next init occurs on the last param
		t.changedSetting  = true;
		t.ApplyJSONEQ();
	},
	
	deleteSetting : function() {
		var t = this;
		var len = t.editedFX.allParams.settings.length;
		if (len < 2) {
			alert("Dear Investor, you must keep at least one setting on your account.");
			return;
		}		
		t.editedFX.allParams.settings.splice(t.editedFX.hlp.curSettingIndex,1);
		if (t.editedFX.hlp.curSettingIndex > len-1)
			t.editedFX.hlp.curSettingIndex = len-1;
		t.enterNewFX(t.editedFX, t.name, t.editedFX.hlp.getCurrentSetting());
	},

	changeReplayMode : function(mode) {
		var t = this;
		t.editedFX.hlp.interp.mode = mode;
		t.enterNewFX(t.editedFX, t.name, t.editedFX.hlp.getCurrentSetting());
	},
	
	enterNewFX : function(_client, _name, _params) {
		var t = this;
		if (!t.editCamera)
			document.getElementById('iconImg').src = "data/editor/editicon.png";
		t.camOffset = [0.0,0.0,0.0];
		t.cameraPosInterpolator = _client.hlp.interp.list[_client.hlp.interp.camPosIndex];
		t.cameraRotInterpolator = _client.hlp.interp.list[_client.hlp.interp.camRotIndex];
	//	t.checkCameraValues();
		t.curCamKeyframeIndex = 0;
		t.status("Entered FX <b>" + _name + "</b>");
		t.entries = [];
		var isNewClient = true;
		if (t.editedFX === _client)
			isNewClient = false;
		if (t.changedSetting) {
			t.changedSetting  = false;
			isNewClient = true;
		}

		t.editedFX = _client;
		t.HTMLCode = "<b><center><h4 style='color:white'>" + _name + "</h3></center></b><br>";
		t.params = _params;
		t.name = _name;
		if (isNewClient) {
			t.resetEditorVariables();
		}
		
		// tab buttons
		t.addTabs();
		
		// replay mode
		t.HTMLCode += "<center>";
		if (t.editedFX.hlp.interp.mode === "setting") {
			t.HTMLCode += "<input type='radio' value='Sequence' onClick='engine.editor.changeReplayMode(\"sequence\");'>  Sequence  ";
			t.HTMLCode += "<input type='radio' value='Setting'  onClick='engine.editor.changeReplayMode(\"setting\");'checked>  Setting";
		} else {
			t.HTMLCode += "<input type='radio' value='Sequence' onClick='engine.editor.changeReplayMode(\"sequence\");'checked>  Sequence  ";
			t.HTMLCode += "<input type='radio' value='Setting'  onClick='engine.editor.changeReplayMode(\"setting\");'>  Setting";
		}
		t.HTMLCode += "</center><br>";
		
		// chooose current setting
		t.HTMLCode += "<br><center>Current setting:<br><input type='text' id='curSettingName' value='" + t.editedFX.allParams.settings[t.editedFX.hlp.curSettingIndex].Setting_Name + "' onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true); engine.editor.refreshCurSettingName();'>";
		t.HTMLCode += "<br><button title='Next setting' onclick='engine.editor.previousSetting();' class='small blue fa  fa-arrow-circle-o-left'></button>";
		t.HTMLCode += "<button title='Previous setting' onclick='engine.editor.nextSetting();' class='small blue fa  fa-arrow-circle-o-right'></button>";
		t.HTMLCode += "<button title='Clone current setting' onclick='engine.editor.cloneSetting();' class='small green fa  fa-plus-square'></button>";
		t.HTMLCode += "<button title='Delete current setting' onclick='engine.editor.deleteSetting();' class='small red fa   fa-remove'></button></center>";
		
		
		//params
		
		t.HTMLCode += "<br><table style='color:#ffffff' cellspacing='0' cellpadding='0'>";
		t.HTMLCode += "<thead><tr>";
		t.HTMLCode += "<th>Params List:</th>";
		t.HTMLCode += "</tr></thead>";
		t.HTMLCode += "<tbody>";
		for (var i = 0; i < _params.length; i++) {
			var ed = getParam(i).editor;
			t.HTMLCode += "<tr>";
			var p = getParam(i);
			if (isNewClient)
				t.isParamFolded[i] = true;
			var curv = p.curve;
			var iname = curv.getName();
			//t.HTMLCode += "<br><hr><b style='color:#ffffff'><center>" + iname + "</center></b>";
			if (t.isParamFolded[i]) {
				t.HTMLCode +="<td onclick='engine.editor.showHideParam = "+i+"' >";
				t.HTMLCode += iname;
				continue;
			}
			else {
				t.HTMLCode += "<td><center><button onclick=\"engine.editor.showHideParam = "+i+"\" class='green fa  fa-arrow-circle-o-up'></i>  "+iname+"  </button>";
				t.HTMLCode += "<button class='green fa fa-picture-o' onclick='engine.editor.editCurve("+i+","+j+");' title='Curve Editor'></button></center>";
				var checked = "";
				if (curv.looping)
					checked=" checked ";
				t.HTMLCode += "<br><center><input type='checkbox'"+checked+"> Is Looping</input></center>";
			}
			for (var j = 0; j < curv.data.length; j++) {
				var name = iname + "_" + i + "_" + j + "_";
				var keyframe = curv.getKeyf(j);
				t.HTMLCode += "<br><span Keyframe #"+j+"</span><br>";
				t.HTMLCode += "<button class='small blue' onclick='engine.editor.keyf_jump("+i+","+j+");' title='Jump to keyframe time'>Keyframe #"+j+"</button>";
				t.HTMLCode += "<button class='small green' title='Insert new frame after' onclick='engine.editor.keyf_insertafter("+i+","+j+", null);'><i class='fa fa-plus-square'></i></button>";
				t.HTMLCode += "<button class='small red' title='Delete' onclick='engine.editor.keyf_delete("+i+","+j+");'><i class='fa  fa-remove'></i></button></center>";

				if (ed && ed.type){
					if (ed.type === 'RGB') {
						t.HTMLCode += "<button class='small blue' title='Color Picker' onclick=\"engine.editor.chooseColor("+i+","+j+",false);\"><i class='fa fa-eyedropper'></i></button>";
					}
					else if (ed.type === 'RGBA') {
						t.HTMLCode += "<button class='small blue' title='Color Picker' onclick=\"engine.editor.chooseColor("+i+","+j+",true);\"><i class='fa fa-eyedropper'></i></button>";
					}
				}
				t.HTMLCode += "<br>Time: ";
				t.priv_addItem(keyframe.time.toFixed(2), name, i, j, "time");
				t.HTMLCode += "<br>Value: ";
				t.priv_addArray(keyframe.values, name, i, j, "value");
			}
			t.HTMLCode += "</td></tr>";
		}
		t.HTMLCode += "</tbody></table>";
		t.HTMLCode += "<br><hr><center><b style='color:white'>JSON equivalent (WIP)</b></center>";
		t.HTMLCode += "<br><center><textarea rows='20' cols='50' id='editorjson' style='font-family:JSGL;' onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true); engine.editor.ApplyJSONEQ(); engine.editor.undoRedoNewValue();'>";
		t.HTMLCode += t.priv_createStringFromData(_name, -1);
		t.HTMLCode += "</textarea></center>";
//		t.HTMLCode += "    <br><button onclick='' style='font-family:JSGL;'>Apply</button>";
//		t.HTMLCode += "        <button onclick='engine.editor.refreshJSONEQ()' style='font-family:JSGL;'>Refresh</button><br>";
		t.applyContent();
		if (isNewClient)
			t.undoRedoNewValue();
	},
	
	refreshJSONEQ  :function () {
		var t = this;
		document.getElementById('editorjson').value = t.priv_createStringFromData(t.name, -1);
		var curv = t.getWatchedCurve();
		if (curv) {
			var data = "allthefuck="+JSON.stringify(curv, null, 4);
			localStorage.setItem("ste_data", data);
			t.editorTimeStamp++;	// change timestamp only after new data is written
			localStorage.setItem("A", t.editorTimeStamp);
		}
	},
	
	
	refreshFXRendering : function() {
		if (engine.paused && !engine.refreshWhilePaused) {
			engine.refreshWhilePaused = true;
			engine.lastupdateTime -= 0.001;
		}
	},
	
	updateCurveEditor : function() {
		var t = this;
		
		var timeControl = localStorage.getItem("TC");
		if (timeControl == 1)
			t.hasTimeControl = true;
		else {
			engine.time = parseFloat(localStorage.getItem("T"));
			t.hasTimeControl = false;
		}
		
		var Sfdbk = localStorage.getItem("B");
		if (Sfdbk)
		{
			var fdbk = parseInt(Sfdbk);
			if (t.feedbackTimeStamp != fdbk) {
				t.feedbackTimeStamp = fdbk;
				var e = t.entries[t.watched];
				var sdata = localStorage.getItem("ste_data");
				eval(sdata);
				if (e.curveIndex != t.watched) {
					alert("Warning: updated curve is not the watched one");
					debugger;
				}
				getParam(e.curveIndex).curve = allthefuck;
				t.lastModifiedKey.curveIndex = e.curveIndex;
				t.lastModifiedKey.keyfIndex = e.keyfIndex;
				t.refreshJSONEQ();
				t.ApplyJSONEQ();
			}
		}
	},

	update : function() {
		var t = this;
		localStorage.setItem("T", engine.time);		

		if (t.refreshTexTab) {
			if (resman.isReady()) {
				t.refreshTexTab = false;
				t.editFXTextures(t.editedFX, t.name, t.params);
				t.status("Texture loaded");
			} else {
				t.status("Waiting for: " + resman.getNextResourceToload());
			}
		}
		var str = "Time: " + engine.time.toFixed(2) + " - ";
		var curv = t.getWatchedCurve();
		if (curv) {
			t.updateCurveEditor();
			str += curv.getName() + ": [";
			for (var i = 0; i < curv.currentValues.length; i++) {
				str += curv.currentValues[i].toFixed(2);
				if (i < curv.currentValues.length-1)
					str += ", ";
				else
					str += "] ";
			}
			t.curCamKeyframeIndex = curv.lastUpdatedKeyf;
			str += " - Key: " + t.curCamKeyframeIndex + " - ";
		}
		str += t.statusMess;
		document.getElementById('status').innerHTML = str;		
		if (t.showHideParam >= 0) {
			if (t.isParamFolded[t.showHideParam]) {
				t.isParamFolded[t.showHideParam] = false;
				t.setWatched(t.showHideParam,false);
			}
			else {
				t.isParamFolded[t.showHideParam] = true;
			}
			t.showHideParam = -1;
			t.enterNewFX(t.editedFX, t.name, t.params);
		}
	},


	ApplyJSONEQ  :function () {
		var t = this;
		var str = document.getElementById('editorjson').value;
		t.editedFX.hlp.onNewEditorSettings(str);
		t.refreshFXRendering();
	},

	saveParamsToCookie : function(_name, _data) {
		var jsonstring = JSON.stringify(_data, null, 4);
		localStorage.setItem(_name, jsonstring);
	},
	
	insertLine : function(_str, _spaces, _new) {
		var str = _str;
		str += "\n";
		for (var i = 0; i < _spaces; i++)
			str += " ";
		str += _new;
		return str;
	},
	
	transferSettings : function() {
	// copy settings to original params for current
		var t = this;
		t.editedFX.allParams.settings[t.editedFX.hlp.curSettingIndex].curves = [];
		var to = t.editedFX.allParams.settings[t.editedFX.hlp.curSettingIndex].curves;
		var from = t.editedFX.hlp.interp.list;
		for (var i=0; i<from.length;i++){
			var fr = from[i];
			to.push({name:fr.curve.getName(), data:[], looping:fr.looping});
			if (fr.editor) {
				to[i].editor = {};
				if (fr.editor.min) to[i].editor.min = fr.editor.min;
				if (fr.editor.max) to[i].editor.max = fr.editor.max;
				if (fr.editor.type) to[i].editor.type = ""+fr.editor.type;
			}
			for (var j = 0; j<fr.data.length; j++){
				to[i].data[j] = {time:fr.data[j].time, type:fr.data[j].type, values:createArrayCopy(fr.data[j].values)};
			}
		}
	},
	
	priv_createStringFromData : function(_name, _dupIndex) {	
		var t = this;
		t.transferSettings();
		
		// sequence data
		var ret = "{\n    sequence:[\n";
		var sparams = t.editedFX.sequenceParams;
		for (var i = 0; i < sparams.length; i++) {
			ret += "\n    {\n";
			ret += "        time : " + sparams[i].time + ",";
			ret += "\n        setting : \"" + sparams[i].setting + "\"";
			ret += "\n    }";
			if ( i < sparams.length-1) ret += ",";
		}

		// texture data
		ret += "],\ntextures:[\n";
		var tparams = t.editedFX.textureParams;
		for (var i = 0; i < tparams.length; i++) {
			ret += "\n    {\n";
			ret += "        file : \"" + tparams[i].file + "\",";
			ret += "\n        friendly : \"" + tparams[i].friendly + "\"";
			ret += "\n    }";
			if ( i < tparams.length-1) ret += ",";
		}
		
		// fields data
		var settings = t.editedFX.allParams.settings;
		ret += "],\nfields:[\n";
		var _params = settings[0].curves;
		for (var i = 0; i < _params.length; i++) {
			ret = t.insertLine(ret, 4, "{");
			var p = _params[i];
			var iname = p.name;
			ret = t.insertLine(ret, 8, "name : '" + iname + "',");
			if (p.editor) {
				var edstr = "editor : {";
				var coma = "";
				if (typeof p.editor.type !== 'undefined') {edstr += "type:'" + p.editor.type + "'"; coma=", ";}
				if (typeof p.editor.min !== 'undefined') {edstr += coma+"min:" + p.editor.min; coma=", ";}
				if (typeof p.editor.max !== 'undefined') {edstr += coma+"max:" + p.editor.max;  coma=", ";}
				edstr += "},";
				ret = t.insertLine(ret, 8, edstr);
			}
			ret = t.insertLine(ret, 8, "default_data : ");
			var keyframe = p.data[0];
			ret = t.insertLine(ret, 12, "{ values : ");
			ret += t.priv_createStringArray(keyframe.values);
			ret = t.insertLine(ret, 12, "}");
			ret = t.insertLine(ret, 4, "}");
			if (i < _params.length-1 )
				ret += ",";
		}
		
		// curves data
		settings = t.editedFX.allParams.settings;
		var cloneStr = "";
		ret += "],\nsettings:[\n";
		for (var setIt = 0; setIt < settings.length; setIt++) {
			ret += "{ Setting_Name: \"" + settings[setIt].Setting_Name + cloneStr + "\",";
			ret += "\ncurves: [\n";
			var _params = settings[setIt].curves;
			for (var i = 0; i < _params.length; i++) {
				var p = _params[i];
				ret = t.insertLine(ret, 4, "{ // " + p.name);
				var lp = p.looping || false;
				ret = t.insertLine(ret, 8, "looping : " + lp + ",");
				//ret = t.insertLine(ret, 8, "looping : " + p.looping + "',");
				ret = t.insertLine(ret, 8, "data : [");
				for (var j = 0; j < p.data.length; j++) {
					var keyframe = p.data[j];
					ret = t.insertLine(ret, 12, "{ values : ");
					ret += t.priv_createStringArray(keyframe.values);
					ret = t.insertLine(ret, 12, "time : " + keyframe.time + "}");
					if (j < p.data.length-1)
						ret += ",";
					else
						ret = t.insertLine(ret, 8, "]");
				}
				ret = t.insertLine(ret, 4, "}");
				if (i < _params.length-1 )
					ret += ",";
			}
			ret += "\n]} // end of setting: " + settings[setIt].Setting_Name + "\n";
			if (setIt < settings.length-1)
				ret += ",\n"
			else if (_dupIndex > -1) {
				ret += ",\n"
				_dupIndex = -1;
				setIt--;
				cloneStr = "_clone";
			}
		}
		ret += "\n] // end of settings\n}\n";
		return ret;
	},

	saveParamsFile : function() {
		var t = engine.editor;
		var curTab = t.curTab;
		t.jumpToTab("params"); // otherwise 'editorjson' is not available
		t.refreshJSONEQ();
		var fname = "params/" + SESSION + "/" + t.name + ".json";
		engine.saveServerFile(fname, document.getElementById('editorjson').value);
		t.status("Saved file:\n" + fname);
		t.jumpToTab(curTab);
	},
	
	keyf_duplicate : function(_keyf) {
		var t = this;
		var newkeyf = {};
		newkeyf.time = _keyf.time;
		newkeyf.values = [];
		var len = _keyf.values.length;
		for (var i = 0; i < len; i++) {
			newkeyf.values[i] = _keyf.values[i];
		}
		return newkeyf;
	},
	
	keyf_getCurrentValuesCopy : function(_keyf) {
		var t = this;
		var newkeyf = {};
		newkeyf.time = _keyf.time;
		var len = _keyf.value.length;
		for (var i = 0; i < len; i++) {
			newkeyf.time[i] = _keyf.time[i];
		}
		return newkeyf;
	},

	keyf_insertafter : function(_paramIndex, _keyIndex, _key) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			var keyf = curv.getKeyf(_keyIndex);
			if (_key)
				keyf = _key;
			newkeyf = t.keyf_duplicate(keyf);
			curv.data.insert(_keyIndex, newkeyf);
			t.lastModifiedKey.curveIndex = _paramIndex;
			t.lastModifiedKey.keyfIndex = _keyIndex;
		}
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		t.refreshFXRendering();
	},
	
	keyf_insertCurState : function(_paramIndex) {		
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			var campos = t.getCamPos(t.editedFX.parent.campos);
			var camrot = t.getCamRot([t.editedFX.parent.camRoll, t.editedFX.parent.camPitch, 0]);
			var keyf = curv.getKeyf(t.curCamKeyframeIndex);
			var duration = Math.max(curv.data[Math.min(t.curCamKeyframeIndex+1), curv.data.length-1].time - keyf.time, 0.00001);
			if (engine.shiftDown) {
				for (var i = 0; i < keyf.to.length; i++) {
					var value = curv.currentValues[i];
					if (curv.getName() === "camPos")
						value = campos[i];
					if (curv.getName() === "camRot")
						value = camrot[i];
					var elapsed = engine.time - keyf.time;
					keyf.to[i] = (duration*(-keyf.value[i] + keyf.value[i]*elapsed/duration + value))/elapsed;
				}
				t.lastModifiedKey.curveIndex = _paramIndex;
				t.lastModifiedKey.keyfIndex = t.curCamKeyframeIndex;
			} else {
				var nextKeyf = null;
				if (t.curCamKeyframeIndex < curv.data.length-1)
					nextKeyf = curv.currentValues[t.curCamKeyframeIndex+1];
					
				var newkeyf = {};
				newkeyf.time = engine.time;
				if (nextKeyf)
					newkeyf.time = duration-engine.time;
				newkeyf.type = keyf.type;
				for (var i = 0; i < keyf.values.length; i++) {
					var value = curv.currentValues[i];
					if (curv.getName() === "camPos")
						value = campos[i];
					if (curv.getName() === "camRot")
						value = camrot[i];
					newkeyf.values[i] = value;
				}
				curv.data.insert(t.curCamKeyframeIndex+1, newkeyf);
				t.lastModifiedKey.curveIndex = _paramIndex;
				t.lastModifiedKey.keyfIndex = t.curCamKeyframeIndex+1;
			}
			t.refreshJSONEQ();
			t.ApplyJSONEQ();
			t.refreshFXRendering();
		}
	},

	editCurve : function(_paramIndex, _keyIndex) {
		window.open("curves_editor.html");
	},
	
	keyf_delete : function(_paramIndex, _keyIndex) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			if (curv.data.length < 2) {
				alert("Can't delete unique keyframe");
				return;
			}
			var keyf = curv.getKeyf(_keyIndex);
			curv.data.splice(_keyIndex,1);
		}
		t.lastModifiedKey.curveIndex = -1;
		t.lastModifiedKey.keyfIndex = -1;
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		t.refreshFXRendering();
	},
	
	keyf_move : function(_paramIndex, _keyIndex, _delta) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			var keyf = curv.getKeyf(_keyIndex);
			var newIndex = _keyIndex+_delta;
			newIndex = Math.min(newIndex, curv.data.length-1);
			newIndex = Math.max(newIndex, 0);
			var keyf2 = curv.data[newIndex];
			curv.data[_keyIndex] = keyf2;
			curv.data[newIndex] = keyf;
			t.lastModifiedKey.curveIndex = _paramIndex;
			t.lastModifiedKey.keyfIndex = newIndex;
		}
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		t.refreshFXRendering();
	},
	
	keyf_jump : function(_paramIndex, _keyIndex) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			var keyf = curv.data[_keyIndex];
			engine.time = keyf.time;
			t.refreshFXRendering();
			t.lastModifiedKey.curveIndex = _paramIndex;
			t.lastModifiedKey.keyfIndex = _keyIndex;
			t.refreshJSONEQ();
			t.ApplyJSONEQ();
			t.refreshFXRendering();
		}
	},
	
	keyf_copy : function(_paramIndex, _keyIndex) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			var keyf = curv.data[_keyIndex];
			t.copyPasteKeyf = t.keyf_duplicate(keyf);
			t.status("Key copied");
		}
	},

	keyf_paste : function(_paramIndex, _keyIndex) {
		var t = this;
		t.setWatched(_paramIndex, true);
		var curv = t.getWatchedCurve();
		if (curv) {
			if (t.copyPasteKeyf) {
				curv.data[_keyIndex] = t.keyf_duplicate(t.copyPasteKeyf);
				t.status("Key pasted");
				t.lastModifiedKey.curveIndex = _paramIndex;
				t.lastModifiedKey.keyfIndex = _keyIndex;
				t.refreshJSONEQ();
				t.ApplyJSONEQ();
				t.refreshFXRendering();
			}
			else alert("Need to copy a keyfrane before pasting it");
		}
	},

	key_IncrValue : function(_index, _amount) {
		var t = this;
		var e = t.entries[_index];
		var ref = null;
		var curv = getParam(e.curveIndex);
		curv.data[e.keyfIndex].values[e.valueIndex] *= _amount;

		localStorage.setItem("entryToWrite", _index);
		
		t.lastModifiedKey.curveIndex = e.curveIndex;
		t.lastModifiedKey.keyfIndex = e.keyfIndex;
		t.refreshJSONEQ();
		t.ApplyJSONEQ();
		t.refreshFXRendering();
	},

	key_SetValue : function(_index, _amount, min, max, isfinal) {
		var t = this;
		_amount = _amount*(max-min)/100.0+min; // 0..100 range to min..max range
		if (!isfinal) {
			var e = t.entries[_index];
			var ref = null;
			var curv = getParam(e.curveIndex);
			curv.data[e.keyfIndex].values[e.valueIndex] = parseFloat(_amount);

			localStorage.setItem("entryToWrite", _index);
			
			t.lastModifiedKey.curveIndex = e.curveIndex;
			t.lastModifiedKey.keyfIndex = e.keyfIndex;
		} else {
			t.refreshJSONEQ();
			t.ApplyJSONEQ();
		}
		t.refreshFXRendering();
	}
}
