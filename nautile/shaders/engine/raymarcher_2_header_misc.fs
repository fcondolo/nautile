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


#ifndef MAIN_START
	#define MAIN_START	rmdata.globalCol = vec3(0.0, 0.0, 0.0); rmdata.camera = camPos; vec3 posToTarget = vec3(0.0, 0.0, 1.0);	rX(posToTarget, camRot.y);	rY(posToTarget, camRot.z); vec3 ct = rmdata.camera + posToTarget; vec3 cd = normalize(ct-rmdata.camera); vec3 cu  = vec3(0.0, 1.0, 0.0); rZ(cu, camRot.x); vec3 cs = cross(cd, cu); rmdata.dir = normalize(cs*pos.x + cu*pos.y + cd*focus);	vec3 col = vec3(0.0); rmdata.p = rmdata.camera; Hit h = Hit(0.0, vec4(col, 0.0), 0, vec3(0.0,0.0,0.0)); rmdata.dist = near; rmdata.p += rmdata.dir * near; rmdata.curIterCount = 0.0;
#endif
