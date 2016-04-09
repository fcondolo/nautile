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
function InterpolatorList(_parent, _fields) {
	var t = this;
	t.listPerSetting = [];
	t.list = [];
	t.parent = _parent;
	t.fields = _fields;
	
	// Common properties
	t.glowAmountIndex = -1;
	t.glowColorSubIndex = -1;
	t.glowBlurScaleIndex = -1;
	t.camPosIndex = -1;
	t.camRotIndex = -1;
	t.listchangeTime = 0.0;
	t.mode = "sequence";
}
 
 InterpolatorList.prototype = {
	addInterpolator : function(lst, paramsDef, paramsVal) {
		var t = this;
		var paramcpy = {};
		paramcpy.name = "" + paramsDef.name;
		paramcpy.looping = paramsVal.looping;
		var pe = paramsDef.editor;
		paramcpy.editor = {};
		if (pe) {
			if (pe.type) paramcpy.editor.type = "" + pe.type;
			if (pe.min) paramcpy.editor.min = pe.min; else paramcpy.editor.min = -100.0;
			if (pe.max) paramcpy.editor.max = pe.max; else paramcpy.editor.max = paramcpy.editor.min + 200.0;
		} else {
			paramcpy.editor.type = 0;
			paramcpy.editor.min = -100.0;
			paramcpy.editor.max = 200.0;			
		}
		paramcpy.data = [];
		var data = paramsVal.data;
	    for (var i=0; i<data.length; i++) {
		var val = {};
		val.time = data[i].time;
		val.type = paramsDef.default_data.type;
			val.values = createArrayCopy(data[i].values);
			paramcpy.data.push(val);
		}
		lst.push(paramcpy);
		var index = lst.length-1;
		
		if (lst[index].name === "glowAmount")
			t.glowAmountIndex = index;
		else if (lst[index].name === "glowColorSub")
			t.glowColorSubIndex = index;
		else if (lst[index].name === "glowBlurScale")
			t.glowBlurScaleIndex = index;
		else if (lst[index].name === "camPos")
			t.camPosIndex = index;
		else if (lst[index].name === "camRot")
			t.camRotIndex = index;
		
		lst[index].data[0].time = 0; // fucks editor otherwise
		return index;
	},

	addInterpolatorLists: function() {
		var t = this;
		t.glowAmountIndex = -1;
		t.glowColorSubIndex = -1;
		t.glowBlurScaleIndex = -1;
		t.camPosIndex = -1;
		t.camRotIndex = -1;
		t.justReset = true;
		for (var st=0; st<t.parent.parent.allParams.settings.length; st++) {
			var lst = [];
			var defList = t.parent.parent.allParams.fields;
		    var valList = t.parent.parent.allParams.settings[st].curves;
			for (var i = 0; i < valList.length; i++)
			    t.addInterpolator(lst, defList[i], valList[i]);
			t.listPerSetting[st] = lst;
		}
		t.list = t.listPerSetting[t.parent.curSettingIndex];
	},
	
	
	getByIndex : function(index) {
		var t = this;
		return t.list[index];
	},
		
	getByName : function(name) {
		var t = this;
		return t.getByIndex(t.getIndexByName(name));
	},

	getIndexByName : function(name) {
		var t = this;
		for (var i = 0; i < t.list.length; i++) {
			if (t.list[i].name === name)
				return i;
		}
		engine.error("InterpolatorList.js, function getIndexByName - Could not find interpolator " + name);
		return -1;
	},

	update : function(time) {
		var t = this;
		if (t.justReset) {
			t.justReset = false;
			for (var st=0; st<t.listPerSetting.length; st++) {
				var lst = t.listPerSetting[st];
				for (var i = 0; i < lst.length; i++) {
					var e = lst[i];
					var field = null;
					if (i < t.fields.length)
					    field = t.fields[i];
					if (field) {
					    e.editor = field.editor;
					    e.name = field.name;
					} else {
					    field = { name: e.name, editor: {}, default_data: { values: [0.00], type: 0 } }
					}
					e.curve = new Curve(field);
					e.curve.setDataFromJSON(e.data, e.looping, 0);
				}
			}
		}

		if (t.mode === "sequence") {
			//document.getElementById('iconImg').src = "data/editor/cameraicon.png";
			var seq = t.parent.parent.allParams.sequence;
			var seql = seq.length;
			for (var cs=0; cs<seql; cs++) {
				var curseq = seq[cs];
				if (cs == seql-1 || (curseq.time <= engine.time && seq[cs+1].time > engine.time)) {
					var found = t.parent.findSettingIndex(curseq.setting);
					if (found<0)
						engine.error("Could not find setting: " + curseq.setting);
					else {
						if (t.parent.curSettingIndex != found){
							t.parent.curSettingIndex = found;
							t.list = t.listPerSetting[found];
							t.listchangeTime = time;
						}
					}
					break;
				}
			}
		} else {
			//document.getElementById('iconImg').src = "data/editor/editicon.png";
		}
		
		for (var i = 0; i < t.list.length; i++) {
			t.private_updateInterp(time-t.listchangeTime, t.list[i]);
		}
	},

	private_updateInterp : function(time, entry) {
		var t = this;
		if (entry)
			entry.curve.getValuesAt(time);
	},

	pushUniformsToShader : function(_passIndex) {
		var t = this;
		for (var i = 0; i < t.list.length; i++) {
		    var entry = t.list[i];
		    var prog = entry.progs[_passIndex];
			if (prog) {
				var curv = entry.curve;
				var val = curv.currentValues;
				var uni = entry.uniform[_passIndex];
				if (uni) {
				    if (engine.currentProgram != prog) {
					    engine.error("pushUniformsToShader error - current program is:" + engine.currentProgram.debugName + " - uniform program is:" + prog.debugName);
						engine.useProgram(prog);
					}
					switch (val.length) {
						case 1: engine.gl.uniform1f(uni, val[0]); break;
						case 2: engine.gl.uniform2fv(uni, val); break;
						case 3: engine.gl.uniform3fv(uni, val); break;
						case 4: engine.gl.uniform4fv(uni, val); break;
						default: engine.error("private_updateInterp: unsupported size"); break;
					}
				}
			} 
		}
	},

	setInitialTime : function (_time) {
		var t = this;
		for (var i = 0; i < t.list.length; i++) {
			var interp = t.list[i];
			for (var j = 0; j < interp.data.length; j++) {
				interp.data[j].time += _time;
			}
		}
	},
	
	setInitialCamera : function (_pos) {
		var t = this;
		if (t.camPosIndex >= 0) {
			var interp = t.list[t.camPosIndex];
			for (var j = 0; j < interp.data.length; j++) {
				for (var k = 0; k < interp.data[j].values.length; k++) {
					interp.data[j].values[k] += _pos[k];
				}
			}
		}
	}
}
