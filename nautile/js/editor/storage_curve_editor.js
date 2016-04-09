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
// Variables


// CANVAS REPARTITION
// values are in percentage of the screen
var windowWidth = 90;	// curve rendering window
var windowHeight = 90;
var toolbarWidth  = (100-windowWidth);
var toolbarHeight  = 100;
var statusHeight = (100-windowHeight)/2;
var titleHeight = statusHeight;
var mouseYScale = (100-windowHeight)*0.01;

// LOCAL STORAGE
var lastTimeStamp = -1; // timestamp from demo to curve editor
var feedbackTimeStamp = 0; // timestamp curve editor to demo

var cvs;
var ctx;
var content;


var dim;
var kprad;
var keys = [];
var pickables = [];
var mouse = {pos:[0,0], down:false};
var data = null;
var keyfCount = 0;
var minX = 0.0;
var maxX = 0.0;
var minY = 0.0;
var maxY = 0.0;
var nx = 1.0;
var ny = 1.0;
var time = 0.0;
var parentDiv = null;
var curveIndex = 0;
var selectedKpIndex = -1;
var toolbar = null;
var statusbar = null;
var titlebar = null;
const minDuration  = 1.0;
var minXslider = null;
var maxXslider = null;
var minYslider = null;
var maxYslider = null;
var paired = false;
var dirty = false;
var connected = false;
var timeRunning = false;
var lastTimeX = 0;
var isLooping = null;
var editorHasTimeControl = true;

function onPageLoaded() {
	initKeyboard();
	resizeCanvases();
	refreshWindowSize();
	setInterval(update , 50);
	title ("No new data yet");
}

function resizeCanvases() {
	content = document.getElementById('content');
	cvs = document.getElementById('cvs');
	toolbar = document.getElementById('toolbar');
	statusbar = document.getElementById('statusbar');
	titlebar = document.getElementById('titlebar');

	content.style.backgroundColor = "#0";
	content.style.position = "fixed";
	content.style.left = "0px";
	content.style.top = titleHeight + "%";
	content.style.width = windowWidth + "%";
	content.style.height = windowHeight + "%";
	
	toolbar.className = "toolBar";
	toolbar.style.width = toolbarWidth + "%";
	toolbar.style.top = content.style.top;
	toolbar.style.width = toolbarWidth + "%";
	toolbar.style.height = content.style.height;
	
	statusbar.className = "statusBar";
	statusbar.style.height = statusHeight + "%";
	
	titlebar.className = "titleBar";
	titlebar.style.height = titleHeight + "%";
}

function mouseY(y) {
//	return (y - cvs.offsetTop)*(1.0 + mouseYScale);
	return y - window.innerHeight * titleHeight / 100.0;
}

function initKeyboard() {
	keys = new Array(512);
	for (var i = 0; i < 512; i++)
		keys[i] = false;
}

function onKeyDown(event) {
	var key = event.keyCode;
	keys[key] = true;
	if (key == 32) {	// spacebar
		editorHasTimeControl = false;
		localStorage.setItem("TC", 2);
		timeRunning	= !timeRunning;
	}
	else if (key == 37) {	// left
		editorHasTimeControl = false;
		localStorage.setItem("TC", 2);
		timeRunning	= false;
		time -= 0.1;
	}
	else if (key == 39) {	// right
		editorHasTimeControl = false;
		localStorage.setItem("TC", 2);
		timeRunning	= false;
		time += 0.1;
	}
}

function onKeyUp(event) {
	var key = event.keyCode;
	keys[key] = false;
}


function onMouseDown(event) {
	mouse.pos = [event.clientX - cvs.offsetLeft, mouseY(event.clientY)];
	mouse.down = true;
	doPicking(mouse.pos[0], mouse.pos[1]);
}

function onMouseUp(event) {
	mouse.down = false;
	if(dirty){
		dirty = false;
		feedbackTimeStamp++;
		localStorage.setItem("B", feedbackTimeStamp);
		localStorage.setItem("ste_data", "allthefuck="+JSON.stringify(data, null, 4));
	}

}

function onMouseMove(event) {
/*	mouse.pos = [event.clientX - cvs.offsetLeft, mouseY(event.clientY)];
	if (mouse.down && selectedKpIndex >= 0) {
		dirty = true;
		var picked = pickables[selectedKpIndex].keyf;
		var d = cvs.height/ny;
		picked.values[curveIndex] = (cvs.height+minY*d-mouse.pos[1])/d;
	}*/
}


function refreshWindowSize(event) {
	console.log("refreshWindowSize");
	cvs.width = window.innerWidth*windowWidth*0.01;
	cvs.height = window.innerHeight*windowHeight*0.01;
	ctx = cvs.getContext("2d");
	dim = Math.min(cvs.width, cvs.height);
	kprad = Math.max(5.0, dim*0.01);
}

function updateNorms() {
	nx = maxX-minX;
	ny = maxY-minY;
	if (nx === 0) nx = minDuration;
	if (ny === 0) ny = 1;
}

function drawTimeBar() {
	if (!connected) return;
	if (editorHasTimeControl)
		time = parseFloat(localStorage.getItem("T"));

	// if looping
	var looptime = Math.max(data.data[keyfCount-1].time, minDuration); // avoid 0 time durations div
	time %= looptime;
	
	lastTimeX = (time - minX) * cvs.width/nx;
	
	ctx.strokeStyle = '#00eaff';
	ctx.fillStyle = '#00eaff';
	
	ctx.beginPath();
	ctx.moveTo(lastTimeX, 0);
	ctx.lineTo(lastTimeX, cvs.height);
	ctx.stroke();
}

function update() {
	ctx.fillStyle = '#555555';
	ctx.globalAlpha = 0.5;
	ctx.fillRect(0,0,cvs.width,cvs.height);
	ctx.globalAlpha = 1.0;
	
	var tc = localStorage.getItem("TC");
	if (tc == 1)
		editorHasTimeControl = true;
	else
		editorHasTimeControl = false;
		
	if (!editorHasTimeControl) {
		if (timeRunning)
			time += 1.0/30.0;
		localStorage.setItem("T", time);
	}
	
	var ST = localStorage.getItem("A");
	if (ST) {
		var timestamp = parseInt(ST);
		if (lastTimeStamp != timestamp) {
			lastTimeStamp = timestamp;
			connected = true;
			var TITLE = localStorage.getItem("CurveName");
			if (TITLE)
				title (TITLE);
			onNewdata();
		}
	}
	
	drawData();
	drawTimeBar();
}

function drawData() {
	if (!connected ||!data)
		return;

	ctx.strokeStyle = '#ffffff';
	ctx.fillStyle = '#ffffff';

	minX = minXslider.value;
	maxX = maxXslider.value;
	minY = minYslider.value;
	maxY = maxYslider.value;
	updateNorms();
	
	for (var i = 0; i < keyfCount; i++) {
		var keyf = data.data[i];
		var nextkeyf = data.data[Math.min(i+1, keyfCount-1)];
		var dim = keyf.values.length;
		var from = keyf.values[curveIndex];
		var to = nextkeyf.values[curveIndex];
		var duration = nextkeyf.time-keyf.time;
		var x1 = (keyf.time - minX) * cvs.width/nx;
		var x2 = (keyf.time + duration - minX) * cvs.width/nx;
		var y1 = (from - minY) * cvs.height/ny;
		var y2 = (to - minY) * cvs.height/ny;
		
		var pick = pickables[i];
		pick.setPos(x1,y1);

		ctx.beginPath();
		ctx.moveTo(x1, cvs.height-y1);
		ctx.lineTo(x2, cvs.height-y2);
		ctx.stroke();
		
		if (x1 <= lastTimeX && x2 >= lastTimeX) {
			var factor = (lastTimeX-x1)/(x2-x1);
			ctx.strokeStyle = '#00eaff';
			ctx.beginPath();			
			ctx.arc(lastTimeX, cvs.height-(y1+(y2-y1)*factor), kprad, 0, 2 * Math.PI, false);
			ctx.stroke();
			ctx.strokeStyle = '#ffffff';
			status("time: " + time + ", value: " + ((to-from)*factor));
		}

	}
}

function showValue(index) {
	curveIndex = index;
	onNewdata();
	status("Watching value #"+(index+1));
}

function onNewdata() {
	var sData = localStorage.getItem("ste_data");
	if (!sData) {
		console.log("Cookie data error: New timestamp without data");
		return;
	}
	eval(sData);
	data = allthefuck;
	keyfCount = data.data.length;
	for (var i = 0; i < pickables.length; i++)
		pickables[i].beforeDelete();
		
	pickables = [];
	minX = data.data[0].time;
	maxX = minX;
	minY = data.data[0].values[0];
	maxY = minY;
		
	for (var i = 0; i < keyfCount; i++) {
		var keyf = data.data[i];
		var nextkeyf = data.data[Math.min(i+1), keyfCount-1];
		var duration = nextkeyf.time-keyf.time;
		var dim = keyf.values.length;
		minX = Math.min(minX, keyf.time);
		maxX = Math.max(keyf.time + duration, maxX);
		var from = keyf.values[curveIndex];
		var to = nextkeyf.values[curveIndex];
		minY = Math.min(minY, from);
		maxY = Math.max(maxY, from);
		minY = Math.min(minY, to);	// with descending curves, to  < from
		maxY = Math.max(maxY, to);
		
		pickables.push(new Pickable("circle", kprad, 0.0, 0.0, '#1ae893', keyf, content));
	}

	updateNorms();
	
	var tlbr = "";
	tlbr += "<center>\n";
	var dim = data.data[0].values.length;
	for (var i = 0; i < dim; i++) {
		tlbr += "<br><button type=\"button\" onclick='showValue("+i+");'>Value "+(i+1)+"</button>"
	}
	tlbr += "<br><br>Looping <input type='checkbox' id='looping' onclick='checkLooping();'>";
	tlbr += "<br>Smoothed <input type='checkbox' id='smoothed' onclick='checkSmoothed();'>";
			
	var minXsldmin = minX-nx-1;
	var minXsldmax = minX+nx+1;
	minXslider = minX - (maxX-minX) * 0.05;	// 5% inset in screen to avoid difficult picking at screen borders
	tlbr += "<br><br>Min X<input type=range min="+minXsldmin+" max="+minXsldmax+" step="+((minXsldmax-minXsldmin)/200.0)+" value="+minXslider+" id='faderX1'>";

	var maxXsldmin = maxX-nx-1;
	var maxXsldmax = maxX+nx+1;
	maxXslider = maxX + (maxX-minX) * 0.05;
	tlbr += "<br><br>Max X<input type=range min="+maxXsldmin+" max="+maxXsldmax+" step="+((maxXsldmax-maxXsldmin)/200.0)+" value="+maxXslider+" id='faderX2'>";

	var minYsldmin = minY-ny-1;
	var minYsldmax = minY+ny+1;
	minYslider = minY - (maxY-minY) * 0.05;
	tlbr += "<br><br>Min Y<input type=range min="+minYsldmin+" max="+minYsldmax+" step="+((minYsldmax-minYsldmin)/200.0)+" value="+minYslider+" id='fader1'>";

	var maxYsldmin = maxY-ny-1;
	var maxYsldmax = maxY+ny+1;
	maxYslider = maxY + (maxY-minY) * 0.05;
	tlbr += "<br><br>Max Y<input type=range min="+maxYsldmin+" max="+maxYsldmax+" step="+((maxYsldmax-maxYsldmin)/200.0)+" value="+maxYslider+" id='fader2'>";

	tlbr += "</center>\n";
	toolbar.innerHTML = tlbr;
	minYslider = document.getElementById('fader1');
	maxYslider = document.getElementById('fader2');
	minXslider = document.getElementById('faderX1');
	maxXslider = document.getElementById('faderX2');
	isLooping = document.getElementById('looping');	
	isLooping.checked = data.looping;
}

function checkLooping() {
	alert("not yet implemented");
	data.looping = isLooping.checked;
}

function checkSmoothed() {
	alert("not yet implemented");
}


function doPicking(mx, my) {
	return;
	var s = pickables.length;
	selectedKpIndex = -1;
	var dist = [];

	// get click weighted dist to every pickingshape
	for (var i = 0; i < s; i++) {
		dist.push(pickables[i].pick(mx, my));
	}

	// identify closest-to-click picking shape
	var minIndex = 0;
	for (var i = 0; i < s; i++) {
		if (dist[i]<dist[minIndex])
			minIndex = i;
	}
	
	for (var i = 0; i < s; i++) {
		if (i === minIndex && dist[minIndex] <= 0.0) {
			pickables[i].onSelected();
			selectedKpIndex = i;
			pickindYDelta = pickables[i].y-my;
		}
	}
}

function title(msg) {
	titlebar.innerHTML = "<center><b>"+msg+"</b></center>";
}

function status(msg) {
	statusbar.innerHTML = msg;
}