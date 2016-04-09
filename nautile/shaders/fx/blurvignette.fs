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

// CONSTANT NAMES SECTION (EXPECTED BY ENGINE)
uniform vec3 iResolution;
uniform float iGlobalTime;
uniform sampler2D uSampler0;
uniform vec2 gaussFilter[7];
varying vec2   vTextureCoord;
 
void main() {
	vec2 frag = vec2(gl_FragCoord.xy/iResolution.xy);
	float vignette = clamp(1.3*(1.0-length(frag-0.5)*1.5), 0.0, 1.0);
	float blur = 1.0-(clamp(1.3*(1.0-length(frag-0.5)*1.6), 0.0, 1.0));
	vec2 u_Scale = vec2 (1.0/iResolution.x, 1.0/iResolution.y);
	vec4 blurcolor = vec4(0.0, 0.0, 0.0, 0.0);
	for( int i = 0; i < 7; i++ )
	{
		blurcolor += texture2D( uSampler0, vec2( frag.x+gaussFilter[i].x*u_Scale.x, frag.y+gaussFilter[i].x*u_Scale.y ) )*gaussFilter[i].y;
	}
/*	vec4 col = texture2D( uSampler0, frag);
	vec4 bcol = blurcolor * blur + col * (1.0-blur);
	gl_FragColor = vec4(bcol.r*vignette, bcol.g*vignette, bcol.b*vignette, 1.0);
	*/
	gl_FragColor = vec4(blurcolor.r, blurcolor.g, blurcolor.b, 1.0);
}
