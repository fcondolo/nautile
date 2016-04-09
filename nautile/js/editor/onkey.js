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

Editor.prototype.onKey = function (_key) {
		var t = this;

		var camspd = 0.2;
		var camrotspd = 0.02;
		switch (_key) {						
			case 33 : // pag up
					if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[2] += camrotspd;
					else
						t.camOffset[2] += camspd;
					t.refreshFXRendering();
					t.statusCamOffset();
					return true;
				} else if (engine.shiftDown) {
					var curv = t.getWatched();
					if (curv) {
						curv.getKeyf(t.curCamKeyframeIndex).values[2] += 0.5;
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				else return false;
			break;

			case 34 : // pag down
				if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[2] -= camrotspd;
					else
						t.camOffset[2] -= camspd;
					t.refreshFXRendering();
					t.statusCamOffset();
					return true;
				} else if (engine.shiftDown) {
					var curv = t.getWatched();
					if (curv) {
						curv.getKeyf(t.curCamKeyframeIndex).values[2] = Math.max(0.0,  curv.getKeyfValue(t.curCamKeyframeIndex, 2)- 0.5);
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				else return false;
			break;

			// ARROWS
			case 37 : // left
				if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[0] += camrotspd;
					else if (engine.shiftDown)
						t.camOffset[0] += camspd;
					else break;
					t.refreshFXRendering();
					t.statusCamOffset();
				} else if (engine.shiftDown) {
					var p = t.getWatched();
					if (p) {
						p.values[t.curCamKeyframeIndex].value[0] = Math.max(0.0,  p.values[t.curCamKeyframeIndex].value[0] - 0.5);
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				return false;
			break;

			case 38 : // up
				if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[1] += camrotspd;
					else if (engine.shiftDown)
						t.camOffset[1] += camspd;
					else break;
					t.refreshFXRendering();
					t.statusCamOffset();
				} else if (engine.shiftDown) {
					var p = t.getWatched();
					if (p) {
						p.values[t.curCamKeyframeIndex].value[1] += 0.5;
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				return false;
			break;

			case 39 : // right
				if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[0] -= camrotspd;
					else if (engine.shiftDown)
						t.camOffset[0] -= camspd;
					else break;
					t.refreshFXRendering();
					t.statusCamOffset();
				} else if (engine.shiftDown) {
					var p = t.getWatched();
					if (p) {
						p.values[t.curCamKeyframeIndex].value[0] += 0.5;
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				return false;
			break;
			
			case 40 : // down
				if (t.editCamera) {
					if (engine.ctrlDown)
						t.camRotOffset[1] -= camrotspd;
					else if (engine.shiftDown)
						t.camOffset[1] -= camspd;
					else break;
					t.refreshFXRendering();
					t.statusCamOffset();
				} else if (engine.shiftDown) {
					var p = t.getWatched();
					if (p) {
						p.values[t.curCamKeyframeIndex].value[1] = Math.max(0.0,  p.values[t.curCamKeyframeIndex].value[1] - 0.5);
						t.refreshJSONEQ();
						t.ApplyJSONEQ();
						t.refreshFXRendering();
					}
				}
				return false;
			break;

			case 49 : t.handleMemory(0); break; // 1
			case 50 : t.handleMemory(1); break; // 2
			case 51 : t.handleMemory(2); break; // 3
			case 52 : t.handleMemory(3); break; // 4
			
			case 67 : // c 
			break;
			
			case 68 : // d --> debugger
					localStorage.setItem("debugger", "hello debugger");
					window.open("debugger.html");
					return true;
			break;
			
			case 69 : // e --> Editor
				if (!engine.isSpecialKeyPressed()) {
					t.toggle();
					return true;
				}
			break;

			case 72 : // h --> Help
				if (t.helpVisible) {
					t.helpVisible = false;
					document.getElementById('help').style.display='none';
				} else {
					t.helpVisible = true;
					if (!t.shown)
						t.toggle();
					document.getElementById('help').style.display='block';
				}
			break;
			
			case 73 : // i --> insert
				if (!engine.isSpecialKeyPressed()) {
					t.insertKeyframe(1);
					return true;
				}
			break;

			case 75 : // k --> reset keyboard
				engine.shiftDown = false;
				engine.ctrlDown = false;
				engine.doCatchKeyboard = true;
			break;

			case 76 : // l --> lock camera
				if (!engine.isSpecialKeyPressed() && t.editCamera) {
					if (t.lockCam) {
						t.lockCam = false;
						document.getElementById('iconImg').src = "data/editor/cameraicon.png";
					} else {
						t.lockCam = true;
						document.getElementById('iconImg').src = "data/editor/cameralockedicon.png";
						t.camLockPos[0] = t.lastCamPos[0];
						t.camLockPos[1] = t.lastCamPos[1];
						t.camLockPos[2] = t.lastCamPos[2];
						t.camLockRot[0] = t.lastCamRot[0];
						t.camLockRot[1] = t.lastCamRot[1];
						t.camLockRot[2] = t.lastCamRot[2];
					}
					return true;
				}
			break;

		    case 77: // m --> toggle music
		        AudioElem.muted = !AudioElem.muted;
		    break;

			case 78 : // n --> camera next keyframe
			{
				var p = t.getWatched();
				if (p) {
					t.curCamKeyframeIndex = (t.curCamKeyframeIndex + 1) % p.values.length;
					engine.time = p.values[t.curCamKeyframeIndex].time;
					t.status("Jumped to keyframe: " + t.curCamKeyframeIndex);
					t.refreshFXRendering();
					return true;
				}
			}
			break;

			case 79 : // o --> overwrite
				if (!engine.isSpecialKeyPressed()) {
					t.insertKeyframe(0);
					return true;
				}
			break;
			
			case 80 : // p --> camera prev keyframe
			{
				var p = t.getWatched();
				if (p) {
					t.curCamKeyframeIndex--;
					if (t.curCamKeyframeIndex < 0)
						t.curCamKeyframeIndex = p.values.length - 1;
					engine.time = p.values[t.curCamKeyframeIndex].time;
					t.status("Jumped to keyframe: " + t.curCamKeyframeIndex);
					t.refreshFXRendering();
					return true;
				}
			}
			break;
			
			case 82 : // r --> rewind
				engine.time = 0;//t.cameraPosInterpolator.values[0].time;
				t.refreshFXRendering();
				t.status("Rewinded");
				return true;
			break;

			case 83 : // s --> shader
				if (engine.shiftDown) {
					t.chooseSlider();
					return true;
				} else {/*t.editedFX.loadTextures(true);*/t.editedFX.hlp.loadShaders(true);}
				return true;
			break;
			
			case 86 : // v --> toggle video recording
				if (!engine.isSpecialKeyPressed()) {
					if (RECORD_VIDEO) {
						engine.stopRecordVideo();
						t.status("Stopped video recording");
						if (t.editCamera)
							document.getElementById('iconImg').src = "data/editor/cameraicon.png";
						else
							document.getElementById('iconImg').src = "data/editor/editicon.png";
					}
					else {
						engine.startRecordVideo();
						t.status("Started video recording");
						document.getElementById('iconImg').src = "data/editor/camerarecord.png";
					}
				}
				return true;
			break;

			case 89 : // y
				if (engine.ctrlDown)
					t.undoRedoForward();
				return true;
			break;
			
			case 90 : // z
				if (engine.ctrlDown)
					t.undoRedoBackwards();
				return true;
			break;

			
			default: 
				return false;
			break;
		}
		return false;
	}
