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


jsLoader_loaded = new Array();
jsLoader_uniqueId = 0;
jsLoader_leftToLoad = 0;
jsLoader_totalLoad = 0;


function jsLoader_isReady() {
	if (jsLoader_leftToLoad > 0)
		console.log("Waiting for jsLoader to load " +  jsLoader_leftToLoad + " / " + jsLoader_totalLoad + " files...");
	return jsLoader_leftToLoad == 0;
}
				
				
function jsLoader_include(source)
{
	var sId = jsLoader_uniqueId.toString();
	jsLoader_uniqueId++;

	if ( ( source != null ) && ( !document.getElementById( sId ) ) ){
		var oHead = document.getElementsByTagName('HEAD').item(0);
		var oScript = document.createElement( "script" );
		oScript.language = "javascript";
		oScript.type = "text/javascript";
		oScript.id = sId;
		oScript.defer = true;
		oScript.text = source;
		oHead.appendChild( oScript );
	}
}

function jsLoader_load(urls, async) {
	for (var i = 0; i < urls.length; i++) {
		if (jsLoader_loaded[urls[i]]) {
			console.log("jsLoader_load skipped already loaded file: " + urls[i]);
			continue;
		}
		jsLoader_leftToLoad++;
		jsLoader_totalLoad++;
		var request = new XMLHttpRequest();
		request.rurl = urls[i];
		request.open('GET', urls[i], async);
		request.setRequestHeader('Cache-Control', 'no-cache');
		request.rindex = i;
		request.onreadystatechange = function () {
			if (this.readyState == 4) {
				jsLoader_include(this.responseText);
				jsLoader_loaded[this.rurl] = true;
				console.log("jsLoader_load loaded file: " + this.rurl);
				jsLoader_leftToLoad--;
			}
		};
		var hasError = false;
		try {
			request.send(null);
		} catch (e) {
			hasError = true;
		}
		if (request.status === 404)
			hasError = true;
		if (hasError)
			engine.error("Error loading file:\n" + urls[i]+ "\n" + e.toString() + "\nMake sure file exists and HTTP Cross origin requests are enabled for your browser, or run the online version");
	}
}