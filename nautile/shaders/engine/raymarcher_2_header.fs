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


/*
===========================================================================
								STRUCTS
===========================================================================
*/

struct Hit
{
	float d;
	vec4 color;
	int id;
	vec3 pos;
};

struct RMData
{
	vec3 p;
	float dist;
	vec3 dir;
	float fogFactor;
	vec2 frag;
	float curIterCount;
	vec3 camera;
	vec3 globalCol;
};

/*
===========================================================================
								UNIFORMS
===========================================================================
*/


uniform sampler2D uSampler0;	// mask
uniform sampler2D uSampler1;	// FX custom tex 1
uniform sampler2D uSampler2;	// FX custom tex 2
uniform sampler2D uSampler3;	// blur tex 1
uniform sampler2D uSampler4;	// blur tex 2
uniform sampler2D uSampler5;	// blur tex 3

uniform vec3 iResolution;
/*
uniform int showGrid;
uniform int showAxis;
uniform int showSun;
*/

uniform vec3 camPos;
uniform vec3 camRot;
uniform vec3 camTarget;
uniform vec3 lightPosNormalized;

uniform float diffuseIntensity;
uniform vec3 diffuseColor;

uniform float specularIntensity;
uniform vec3 specularColor;
uniform float specularFallOff;

uniform float focus;
uniform float near;
uniform float far;
uniform float fogfar;
uniform float iGlobalTime;


/*
===========================================================================
								GLOBAL VARIABLES DECLARATIONS
===========================================================================
*/
	RMData rmdata;


/*
===========================================================================
								FUNCTIONS PRE-DECLARATIONS
===========================================================================
*/
Hit scene(vec3 p, float dist);
