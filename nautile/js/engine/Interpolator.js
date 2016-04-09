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
function Interpolator(name) {
	var t = this;
	t.name = name;	
	t.lastUpdatedKeyf = 0;
	t.value = [];
	t.values = [];
}
 
 Interpolator.prototype = {
	 	 
	 setValues : function (_values, _time) {
		var t = this;
		t.values = _values;
		t.value = [];
		var time = 0.0;//_time;
		for (var i = 0; i < t.values.length; i++) {
			var keyframe = t.values[i];
			keyframe.spd = [];
			keyframe.startTime = time;
			time += keyframe.duration;
			keyframe.endTime = time;
			keyframe.itype = 0;
			if (keyframe.type) {
				if (keyframe.type === "linear") keyframe.itype = 0;
				else if (keyframe.type === "scurve") keyframe.itype = 1;
				else if (keyframe.type === "spline") keyframe.itype = 2;
			}
			for (var j = 0; j < keyframe.from.length; j++) {
				keyframe.spd[j] = (keyframe.to[j]-keyframe.from[j])/keyframe.duration;
			}
		}
		for (var j = 0; j < t.values[0].from.length; j++)
			t.value[j] = t.values[0].from[j];
	},

	 getValueAt :  function(time) {
		var t = this;
		var lastKeyfIndex = t.values.length-1;
		var keyf = t.values[lastKeyfIndex];

		if (time <= t.values[0].startTime) {
			for (var j = 0; j < t.values[0].from.length; j++)
				t.value[j] = t.values[0].from[j];
			t.lastUpdatedKeyf = 0;
			return t.value;
		}
		if (time >= t.values[lastKeyfIndex].endTime) {
			for (var j = 0; j < t.values[lastKeyfIndex].to.length; j++)
				t.value[j] = t.values[lastKeyfIndex].to[j];
			t.lastUpdatedKeyf = lastKeyfIndex;
			return t.value;
		}

		for (var i = 0; i <= lastKeyfIndex; i++) {
			var keyframe = t.values[i];
			if (keyframe.endTime >= time) {
				keyf = keyframe;
				t.lastUpdatedKeyf = i;
				break;
			}
		}

		var elapsed = time - keyf.startTime;

		switch (keyframe.itype) {		
			case 0: // LINEAR 
				for (var i = 0; i < keyf.from.length; i++)
					t.value[i] = keyf.from[i] + keyf.spd[i] * elapsed;
			break;

			case 1: // S CURVE
				var ratio = 12.0*elapsed/keyf.duration - 6.0;
				for (var i = 0; i < keyf.from.length; i++)
					t.value[i] = keyf.from[i] + keyf.spd[i] * keyf.duration * 1.0/(1.0+Math.exp(-ratio));
			break;
			
			default:
				alert("spline type not yet implemented");
			break;
		}
		return t.value;
	},

	adjustTo : function (val, index, component) {
		var t = this;
		var e = t.values[index];
		e.to[component] =  (e.duration * (engine.time-e.startTime)) * (e.from[component]/e.duration * (engine.time-e.startTime) + val);
	}
}
