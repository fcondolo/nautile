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

var TIME_OF_FIRST_BEAT = 39.0;

function BeatHandler() {
	var t = this;
	t.setBPM(125.0);
	t.reset(0.0);
	t.setTimeOffset(t.secondsForOneHalfBeat * 0.75); // trigger on snare, not bdrum
	t.nextBeatTime = 0.0;
	t.even = 0;
	t.lastIntTime = 0;
	t.beatOccuredThisFrame = false;
}

BeatHandler.prototype = {
	reset : function(_time) {
	    var t = this;
	    if (t.secondsForOneBar != 0.0)
	        _time += t.secondsForOneBar - (_time % t.secondsForOneBar);
		t.lastBeatTime = _time;
		t.lastBarTime = _time;
		if (t.secondsForOneBar != 0.0)
			Math.floor(t.lastBarIndex = _time / t.secondsForOneBar);
		else
			t.lastBarIndex = 0;
		t.lastBeatValue = 0;
		t.lastGetDataIsBeat = 0;
		t.beatBarFader = 0.0;
		t.nextBeatTime = _time + t.secondsForOneBar;
	},
	
	
	setBPM : function(_bpm) {
		var t = this;
		t.bpm = _bpm;
		t.beatsPerSecond = t.bpm / 60.0;
		t.secondsForOneBeat = 1.0 / t.beatsPerSecond;
		t.secondsForOneBar = t.secondsForOneBeat * 2.0;
		t.secondsForOneHalfBeat = t.secondsForOneBeat * 0.5;
		t.toleranceForOneBeat = t.secondsForOneBeat * 0.1
		t.toleranceForOneHalfBeat = t.secondsForOneHalfBeat * 0.1
		t.toleranceForOneBar = t.secondsForOneBar * 0.1
	},

	setTimeOffset : function(_offset) {
		var t = this;
		t.offset = _offset;
	},
	
	scaleBar : function(_scale) {
		var t = this;
		t.secondsForOneBar *= _scale;
	},
	
	getData : function (_prevTime, _curTime) {
	    var t = this;
	    t.beatOccuredThisFrame = false;

	    var thisTime = Math.floor(_curTime + t.toleranceForOneBar);
	    if (thisTime < TIME_OF_FIRST_BEAT)
	        return 0;
	    if (thisTime != t.lastIntTime) {
	        t.lastIntTime = thisTime;
	        t.even = (t.even + 1) & 1;
	        if (t.even == 1) {
	            t.beatBarFader = 1.0;
	            t.beatOccuredThisFrame = true;
	        }
	    } else {
	        t.beatBarFader = Math.max(0.0, t.beatBarFader - engine.deltaTime);
	        return 2;
	    }
	    return 0;
        /*
		var correctedTime = _curTime;//t.offset + _curTime;
		t.lastGetDataIsBeat = 0;
		t.beatBarFader -= engine.deltaTime;
		t.beatBarFader = Math.max(0.0, t.beatBarFader - engine.deltaTime);
		
		if (Math.abs(correctedTime - t.lastBeatTime) < 0.5)
			return 0;
						
		while (t.nextBeatTime + t.secondsForOneBar < correctedTime)
			t.nextBeatTime += t.secondsForOneBar;
		t.nextBeatTime += t.secondsForOneBar - (t.nextBeatTime % t.secondsForOneBar);

		var delta = Math.abs(t.nextBeatTime-correctedTime);
		if (delta <= t.toleranceForOneBar) {
			t.lastBeatTime = t.nextBeatTime;
			t.lastBeatValue = 2;
			t.lastGetDataIsBeat = 2;
			t.even = 0;//(t.even + 1) & 1;
			if (t.even == 0 && correctedTime > TIME_OF_FIRST_BEAT)
			    t.beatBarFader = 1.0;
			t.lastBarTime = t.nextBeatTime;
			t.lastBarIndex++;
			while (t.nextBeatTime < correctedTime) {
			    t.nextBeatTime += t.secondsForOneBar;
			}
			t.nextBeatTime += t.secondsForOneBar - (t.nextBeatTime % t.secondsForOneBar);
			console.log("BEAT at:" + _curTime + ", next:" + t.nextBeatTime);
			return 2;
		}
			
		return 0;
        */
	}
}