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

Editor.prototype.seq_onTimeChanged = function(_index, _value){
	var  t = this;
	t.editedFX.allParams.sequence[_index].time = parseFloat(_value);
	t.editSequence();
}

Editor.prototype.seq_onSettingChanged = function(_index, _value){
	var  t = this;
	t.editedFX.allParams.sequence[_index].setting = _value;
	t.editSequence();
}

Editor.prototype.seq_cloneSeqEntry = function(_index) {
	var  t = this;
	var ref = t.editedFX.allParams.sequence[_index];
	t.editedFX.allParams.sequence.insert(_index, {time:ref.time, setting:ref.setting});
	t.editSequence();
}

Editor.prototype.seq_deleteSeqEntry = function(_index)
 {
	var  t = this;
	if (t.editedFX.allParams.sequence.length < 2) {
		alert("Dear Investor, you must leave at lesast one setting on your account");
		return;
	}

	t.editedFX.allParams.sequence.splice(_index, 1);
	t.editSequence();
}

Editor.prototype.editSequence = function() {
		var t = this;
		if (!t.allowRefresh) {
			t.allowRefresh = true;
			return;
		}
		t.HTMLCode = "<b><center><h4 style='color:white'>" + t.name + "</h3></center></b><br>";
		t.addTabs();
		t.HTMLCode +=  "<br><center>Time / Setting</center>";
		var s = t.editedFX.allParams.settings;
		var l = s.length;
		var seq = t.editedFX.allParams.sequence;
		var sl = seq.length;
		for (var i=0; i<sl; i++) {
			t.HTMLCode +=  "<br><center><input maxlength='6' size='6' type='text' id='TX_" + i + "' value='" + seq[i].time + " 'onfocus='engine.catchKeyboard(false);' onblur='engine.catchKeyboard(true); engine.editor.seq_onTimeChanged("+i+",this.value);'>";
			t.HTMLCode +=  "<select onChange=engine.editor.seq_onSettingChanged("+i+",this.value);>";
			for (var j=0; j<l; j++){
				var n = s[j].Setting_Name;
				if (n === seq[i].setting)
					t.HTMLCode +=  "<option selected value='"+n+"'>"+n+"</option>"
				else
					t.HTMLCode +=  "<option value='"+n+"'>"+n+"</option>"
			}
			t.HTMLCode +=  "</select>";
			t.HTMLCode += "<button title='Add below' onclick='engine.editor.seq_cloneSeqEntry("+i+");' class='small green fa  fa-plus-square'></button>";
			t.HTMLCode += "<button title='Delete' onclick='engine.editor.seq_deleteSeqEntry("+i+");' class='small red fa fa-remove'></button></center>";
		}
		t.applyContent();
	}
	