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
uniform float iGlobalTime;
uniform vec2 lightPos;
uniform float decay;

const int NUM_SAMPLES = 55;


void main()
{
   vec2 pos = vec2(gl_FragCoord.xy/iResolution.xy);
    
    vec2 uv = pos;
    vec4 buffer = texture2D(uSampler0,uv);
    float exposure=0.21;
    float density=0.926;
    float weight=0.58767;
        
    vec2 tc = uv;
    vec2 deltaTexCoord = tc;
    
    deltaTexCoord =  uv+lightPos;//vec2(sin(iGlobalTime*.7)*.3,-cos(iGlobalTime*.2)*.3)-.5;
    deltaTexCoord *= 1.0 / float(NUM_SAMPLES)  * density;
    
    float illuminationDecay = 1.0;
    vec4 color =texture2D(uSampler0, tc.xy)*0.305104;
    
//    tc += deltaTexCoord * fract( sin(dot(uv.xy+fract(iGlobalTime), 
//                                         vec2(12.9898, 78.233)))* 43758.5453 );
    tc += deltaTexCoord * fract( sin(dot(uv.xy, 
                                         vec2(12.9898, 78.233)))* 43758.5453 );
    
    for(int i=0; i < NUM_SAMPLES; i++)
    {
        tc -= deltaTexCoord;
        vec4 sample = texture2D(uSampler0, tc)*0.305104;
        sample *= illuminationDecay * weight;
        vec4 noise = texture2D(uSampler1,tc+vec2(uv.x*0.1, uv.y*0.1+iGlobalTime*0.02));
        //sample.rgb *= noise.rgb;
        color += sample * (0.5+min(noise.r,0.5));
        illuminationDecay *= decay;
    }
    vec4 godRays = min(vec4(1.0),color*exposure);
    gl_FragColor = clamp(0.5*buffer+0.5*godRays, vec4(0.0), vec4(1.0));
}