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
uniform sampler2D uSampler0;
uniform sampler2D uSampler1;
uniform float sensitivity;

const int blur_size = 30;
const float blur_width = 1.;

float gauss(float x, float e)
{
    return exp(-pow(x, 2.)/e); 
}

// Vertical blurring
void main()
{
   vec2 pos = vec2(gl_FragCoord.xy/iResolution.xy);
   vec4 pixval = vec4(0.);
   float tot = 0.;
    
   const int nb = 2*blur_size+1;
   float vignette = 0.3*max(0.0,1.0-2.0*pos.y)  + 0.01;
   vignette = max(vignette,0.2*max(0.0,abs(0.5-pos.x))  + 0.01);
   
   for (int x=0; x<nb; x++)
   { 
       float x2 = blur_width*float(x-blur_size);
       vec2 ipos = pos + vec2(0., x2/iResolution.x);
       float g = gauss(x2, float(20*blur_size)*vignette);
       pixval+= g*texture2D(uSampler1, ipos);
       tot+= g;
   }
   gl_FragColor = pixval/tot;//vec4(vignette);
}

