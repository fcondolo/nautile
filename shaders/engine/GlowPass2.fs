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

#ifdef GL_ES
precision highp float;
#endif

uniform vec3 iResolution;
uniform vec3 glowAmount;
uniform sampler2D uSampler0;	// cur fx
uniform sampler2D uSampler1;	// cur fx glow

void main() {
	vec2 frag = vec2(gl_FragCoord.xy/iResolution.xy);
	vec4 c0 = texture2D(uSampler0, frag);
	vec4 c1 = texture2D(uSampler1, frag);
	vec4 col;
	col.rgb = c0.rgb + c1.rgb * glowAmount;
	col.a = 1.0;
	gl_FragColor = col;
}
