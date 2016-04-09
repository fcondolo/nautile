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

var PHPCB = {};

function ReplaceTextureFromDrag(evt) {
	var file = evt.dataTransfer.files[0];
	if (file) {
		engine.editor.replaceTexture(this.index, file);
	}
	evt.stopPropagation();
	evt.preventDefault();
}

function OnHoverTexDiv(evt) {
	evt.stopPropagation();
	evt.preventDefault();
}

function OnClickTexDiv(evt) {
	document.getElementById("editFXTextures"+this.index).click();
}

Editor.prototype.replaceTexture = function (_index, _file) {
		var t = this;
		var targetImg = document.getElementById('edImg'+_index);
		targetImg.src = "data/editor/editorLoading.jpg";
		var file = _file;
		if (!file)
			file = document.getElementById('editFXTextures'+_index).files[0];
			
		PHPCB.index = _index;
		PHPCB.file = file;
		PHPCB.targetImg = targetImg;
		if (file) {
			var reader = new FileReader();
			reader.readAsDataURL(file);
			reader.onload = function(imgsrc) {
				PHPCB.targetImg.src = imgsrc.target.result; // temporarilly set local texture while loading
 				var xhr = new XMLHttpRequest();
				xhr.file = PHPCB.file;
				xhr.addEventListener('progress', function(e) {
					var done = e.position || e.loaded, total = e.totalSize || e.total;
					engine.editor.status('upload in progress: ' + (Math.floor(done/total*1000)/10) + '%');
				}, false);
				if ( xhr.upload ) {
					xhr.upload.onprogress = function(e) {
						var done = e.position || e.loaded, total = e.totalSize || e.total;
						engine.editor.status('upload in progress: ' + done + ' / ' + total + ' = ' + (Math.floor(done/total*1000)/10) + '%');
					};
				}
				xhr.onreadystatechange = function(e) {
					if ( 4 == this.readyState ) {
						engine.editor.status(['upload complete', e]);
						engine.editor.editedFX.textureParams[PHPCB.index].file = "trydata/"+PHPCB.file.name;
						engine.pushContext(webgl_2d_raymarch, "editor replacetexture");
							engine.editor.refreshTexTab = true;
							engine.editor.editedFX.textures[PHPCB.index] = resman.prefetchTexture(engine.editor.editedFX.textureParams[PHPCB.index].file);
						engine.popContext();
					}
				};
				var data = new FormData();
				data.append("file" , PHPCB.file);
				xhr.open('post', 'upload1local.php', true);
				xhr.send(data);
			};
		}
	},


Editor.prototype.editFXTextures = function(_client, _name, _params) {
		var t = this;
		if (!t.allowRefresh) {
			t.allowRefresh = true;
			return;
		}
		t.HTMLCode = "<b><center><h4 style='color:white'>" + _name + "</h3></center></b><br>";
		t.addTabs();
		var texparam = t.editedFX.textureParams;

		for (var i = 0; i < texparam.length; i++){
			var formId = "\"editorform"+i+"\"";
			var change = "onchange='engine.editor.replaceTexture("+i+", null);'";
			t.HTMLCode += "<div id=\"imgdiv"+i+"\">";
			t.HTMLCode += "<center><b style='color:white'>"+texparam[i].friendly+"</b></center>";
			t.HTMLCode += "<center><img id='edImg"+i+"' style='width:80%; left:auto; right:auto;' src='"+texparam[i].file+"'></center>";
			t.HTMLCode += "<input "+change+" accept=\".jpg\" type=\"file\" name=\"files[]\" id=\"editFXTextures"+i+"\" style=\"display:none;\">";
			t.HTMLCode += "</div>";
			t.HTMLCode += "<hr>";
		}
		t.applyContent();
		for (var i = 0; i < texparam.length; i++){
			var imgdiv = document.getElementById("imgdiv"+i);
			imgdiv.index = i;
			imgdiv.style.cursor="pointer";
			imgdiv.addEventListener('click', OnClickTexDiv, false);
			imgdiv.addEventListener('dragover', OnHoverTexDiv, false);
			imgdiv.addEventListener('drop', ReplaceTextureFromDrag, false);
		}
	}
	