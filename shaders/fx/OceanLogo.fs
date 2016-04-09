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
uniform float iGlobalTime;
uniform float neon;
uniform float neon2;
uniform float logoAlpha;
uniform sampler2D uSampler0; // 
uniform sampler2D uSampler1; // ocean fx
uniform sampler2D uSampler2; // logo
uniform sampler2D uSampler3; // 
uniform sampler2D uSampler4; // flare

vec2 conv(vec2 uv) {
    uv.x = clamp((uv.x-0.5) * 1.3 + 0.5, 0.0, 1.0);
    //uv.y = (uv.y-0.5) * 0.9 + 0.5;
    return uv;
}

vec2 conv2(vec2 uv) {
    uv = (uv- vec2(0.5)) * 0.9 + vec2(0.5);
    return uv;
}

void main()
{
   vec2 center = vec2(0.0, 0.45);
   vec2 pos = vec2(gl_FragCoord.xy/iResolution.xy);
   vec4 pix = texture2D(uSampler1, pos);   
   vec4 pix2 = texture2D(uSampler1, vec2(pos.y,pos.x));
   vec4 flare = texture2D(uSampler4, vec2(pos.x+0.16*sin(iGlobalTime*0.15), pos.y));

   vec2 posLogo = pos + center;
   posLogo.y = clamp(posLogo.y, 1.0-0.13, 1.0-0.0);
   vec4 logo = texture2D(uSampler2, conv(posLogo));

   vec2 posRefl = posLogo;
   posRefl.y -= 0.13;
   vec4 refl = texture2D(uSampler2, conv(posRefl));

   vec2 posDrops = posRefl;
   posDrops.y -= 0.13;
   vec4 drops = texture2D(uSampler2, conv(posDrops));

   vec2 posFog = posDrops;
   posFog.x = mod(posFog.x+iGlobalTime * 0.003, 1.0);
   posFog.y -= 0.14;
   posFog.y += 0.01 * sin(iGlobalTime*0.4 + pos.x*20.0+pos.y);
   vec4 bluefog = texture2D(uSampler2, conv(posFog));
   bluefog.a = min(bluefog.a, max(0.0,pos.x-0.2));
   bluefog.a = min(bluefog.a, max(0.0,0.8-pos.x));

   vec2 posFishes = posFog;
   posFishes.x = mod(posFishes.x+(iGlobalTime- 15.0) * 0.0035 ,1.0);
   posFishes.y -= 0.14;
   posFishes.y += 0.01 * sin(iGlobalTime*0.45 + pos.x*25.0+1.0+pos.y);
   vec4 fishes = texture2D(uSampler2, conv(posFishes));
   fishes.a = min(fishes.a, max(0.0,pos.x-0.2));
   fishes.a = min(fishes.a, max(0.0,0.8-pos.x));
   vec4 fishesShadow = texture2D(uSampler2, conv2(posFishes)+vec2(0.0051,0.0051));
   fishesShadow.rgb += texture2D(uSampler2, conv2(posFishes)+vec2(0.01,0.0)).rgb;
   fishesShadow.rgb += texture2D(uSampler2, conv2(posFishes)+vec2(-0.005,0.0)).rgb;
   fishesShadow.rgb += texture2D(uSampler2, conv2(posFishes)-vec2(0.0051,0.0051)).rgb;
   fishesShadow.rgb *= 0.25;
   
   logo.rgb += min(1.0, refl.r+0.4) * pix2.rgb * vec3(0.75,0.75,0.75); // transp
   logo.rgb *= vec3(1.0-fishesShadow.b*fishesShadow.a*0.4);
   logo.rgb += neon * drops.rgb * vec3(0.5,0.8,1.0); // drops

   logo.a = min(logoAlpha, logo.a);
   bluefog.a = min(logoAlpha, bluefog.a);
   fishes.a = min(logoAlpha, fishes.a);

   pix.rgb = pix.rgb*(1.0-logo.a) + logo.rgb*logo.a; // composition with background
   pix.rgb = pix.rgb*(1.0-bluefog.a) + bluefog.rgb * bluefog.a * 1.5; // fog
   pix.rgb = pix.rgb*(1.0-fishes.a) + fishes.rgb * fishes.a * 4.5; // fishes
   pix.rgb += neon2 * vec3(1.5,0.5,1.4) * (1.0-logo.a)* flare.rgb * logoAlpha * pow(1.0-length(pos-vec2(0.5,0.5)), 4.0); // flare
   gl_FragColor = pix ;
}