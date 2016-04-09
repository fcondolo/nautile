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


paramsLoader_uniqueId = 0;
paramsLoader_leftToLoad = 0;
paramsLoader_totalLoad = 0;
paramsLoader_list = [];
paramsLoader_Default = [];

function paramsLoader_loadAll() {
		paramsLoader_load([
		"RmDefault.json",
		"RmHaze.json",
		"RmSeaTrees.json",
		"CausticCity.json",
		"Corail.json",
		"Ocean.json"
		], true);
}

function paramsLoader_isReady() {
	if (paramsLoader_leftToLoad > 0)
		console.log("Waiting for paramsLoader to load " +  paramsLoader_leftToLoad + " / " + paramsLoader_totalLoad + " files...");
	return paramsLoader_leftToLoad == 0;
}
				
				
function paramsLoader_get(url, client) {
	if (paramsLoader_leftToLoad>0)
		engine.error("Error: Not finished loading params");
		
	var l = paramsLoader_list.length;
	for (var i = 0; i < l; i++) {
		if (paramsLoader_list[i].file === url) {
			client.onParamLoaded(url, paramsLoader_list[i].data);
			return;
		}
	}
	var errText = "Error : paramsLoader did not find " + url + ". Available files are: "
	for (var i = 0; i < l; i++) {
		errText += paramsLoader_list[i].file + ", ";
	}
	engine.error(errText);
}


function paramsLoader_load(urls, async) {
	for (var i = 0; i < urls.length; i++) {
		paramsLoader_leftToLoad++;
		paramsLoader_totalLoad++;
		var request = new XMLHttpRequest();
		request.rurl = urls[i];
		request.open('GET', "params/" + SESSION + "/"+urls[i], async);
		request.setRequestHeader('Cache-Control', 'no-cache');
		request.rindex = i;
		request.onreadystatechange = function () {
			if (this.readyState == 4) {
				console.log("paramsLoader_load loaded file: " + this.rurl);
				if (this.rurl === "RmDefault.json") {
					paramsLoader_Default = eval(this.responseText);
				} else {
					paramsLoader_list.push({file:this.rurl, data:this.responseText});
				}
				paramsLoader_leftToLoad--;
			}
		};
		var hasError = true;
		try {
		    request.send(null);
		    hasError = false;
		} catch (e) {
			hasError = true;
		}
		if (request.status === 404)
			hasError = true;
		if (hasError)
		    alert("YOU ARE PROBABLY RUNNING THIS DEMO WITH THE WRONG BROWSER SETTINGS!\n\nError loading file: " + urls[i] + "\n\nMake sure file exists and HTTP Cross origin requests are enabled for your browser");
	}
}