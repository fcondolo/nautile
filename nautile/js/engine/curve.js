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
	BEWARE! A Curve is multi-dimentional (depends of the keyframe's "value[]" array size).
**/

/**
 * @constructor
 */
function Curve(_field) {
	if (!_field) {
	    _field = { name: 'noname', editor: {}, default_data: { values: [0.00], type: 0 } };
	    debugger;
    }	
	var t = this;
	t.field = _field;
	t.lastUpdatedKeyf = 0;
	t.currentValues = [];
	t.data = _field.default_data.values;
	t.looping = false;
	t.type = 0;
	t.name = _field.name;
}
 
 Curve.prototype = {
	getKeyf : function (i) {
		return this.data[i];
	},

	getKeyfTime : function (i) {
		return this.data[i].time;
	},

	getKeyfValues : function (i) {
		return this.data[i].values;
	},

	getKeyfValue : function (keyfIndex, valueIndex) {
		return this.data[keyfIndex].values[valueIndex];
	},
	
	getName : function () {
		return this.field.name;
	},
	
	setDataFromJSON : function (_data, looping, type) {
		var t = this;
		t.data = _data;
		t.currentValues = [];
		t.looping = looping || false;
		t.type = type || 0;
		var keyf = t.getKeyfValues(0);
		var len = keyf.length;
		for (var j = 0; j < len; j++)
			t.currentValues[j] = keyf[j];
	},

	 copyFrom : function(_from) {
		var t = this;
		t.field = _from.field;
		t.looping = _from.looping;
		t.type = _from.type;
		t.currentValues = createArrayCopy(_from.currentValues);
		t.data = [];
		for (var i=0; i<_from.data.length;i++){
			var  v = {
				time:_from.data[i].time,
				type:_from.data[i].type,
				values:createArrayCopy(_from.data[i].values),
			};
			t.data.push(v);
		}
	 },

	copyKfToCurrentValues:  function(val) {
		var t = this;
		var len = val.length;
		for (var j = 0; j < len; j++)
			t.currentValues[j] = val[j];
	},
	 
	 getValuesAt :  function(time) {
		var t = this;
		var lastKeyfIndex = t.data.length-1;
		var lastKeyf = t.data[lastKeyfIndex];
		
		if (t.looping && lastKeyf.time > 0.1)
			time %= lastKeyf.time;
		
		if (time <= t.data[0].time) {
			t.copyKfToCurrentValues(t.getKeyfValues(0));
			t.lastUpdatedKeyf = 0;
			return t.currentValues;
		}
		if (time >= lastKeyf.time) { // in case no looping is done
			t.copyKfToCurrentValues(lastKeyf.values);
			t.lastUpdatedKeyf = lastKeyfIndex;
			return t.currentValues;
		}
		
		var curKeyf = lastKeyf;
		var i;
		for (i = 0; i < lastKeyfIndex; i++) {
			var keyframe = t.data[i];
			var nextKeyframe = t.data[i+1];
			if (time >= keyframe.time && time <= nextKeyframe.time) {
				curKeyf = keyframe;
				t.lastUpdatedKeyf = i;
				break;
			}
		}

		var nextkeyf = t.data[Math.min(i+1, lastKeyfIndex)];
		var elapsed = time - curKeyf.time;
		var duration = Math.max(nextkeyf.time-curKeyf.time, 0.000001);
		var curValues = curKeyf.values;
		var nextValues = nextkeyf.values;
		switch (t.type) {		
			case 0: // LINEAR 
				var len = curValues.length;
				for (var i = 0; i < len; i++) {
					var spd = (nextValues[i]-curValues[i])/duration;
					t.currentValues[i] = curValues[i] + spd * elapsed;
				}
			break;

			case 1: // S CURVE
				var len = curValues.length;
				var ratio = 12.0*elapsed/duration - 6.0;
				for (var i = 0; i < len; i++) {
					var spd = (nextValues[i]-curValues[i]);
					t.currentValues[i] = curValues[i] + spd * 1.0/(1.0+Math.exp(-ratio));
				}
			break;
			
			default:
				engine.error("unknown curve type");
			break;
		}
		return t.currentValues;
	}
}
