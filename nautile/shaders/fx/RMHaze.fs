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

#define SCENE myscene(_p,_d)
#define MIN_CAM_DIST 1.0
#define MAX_ITER 80
//#define COLLISION_EPSILON (0.001 * (1.0 + 2.0*fi))
#define COLORIZE col_haze
#define START_FRAME startFrame()
#define COMPUTE_NORMAL hazeNormal
#define COLLISION_TEST
#define MARCH h.d*0.75
#define COLLISION_EPSILON 0.001

//parameters
#define USE_TEXTURE_COL
#define FOG_END 20.0
#define LIGHT_RAYS
//#define DESATURATE
uniform float dustLevel;
uniform float dustSpeed;
uniform float dustChroma;
uniform vec2 dustAlpha;
uniform vec3 shaping;
uniform vec2 texRatio;
uniform vec4 trailWeight;
uniform float textureScale;
uniform float dustSpacing;
uniform sampler2D uSampler7;
uniform float textratio;
uniform float remaining;
uniform float beatBarFader;

// local variables
float colorAmount;
float distToCam;

vec3 computeColor() {
	return 1.75*rmdata.globalCol/(colorAmount+0.0001);
}

float min4(float a, float b, float c, float d)
{
	return min(min(a,b),min(c,d));
}

float max4(float a, float b, float c, float d)
{
	return max(max(a,b),max(c,d));
}



float creatureHead(vec3 p, float r)
{
    float mvt = abs(cos(iGlobalTime+p.z));
    float xyScale = 0.5*sin(p.z*1.0+iGlobalTime);
	return length(vec3(p.x*2.0+xyScale,p.y*3.0+xyScale,p.z*(1.0+0.5*mvt)))-r;
}

float SeaCreature ( vec3 _p, float len, float xThickness, float yThickness) {
    vec3 p = _p + vec3(0.0, 0.0, -11.0);

    float dz = p.z-len;
	float x = 0.0+1.85*cos(1.0*p.z+4.0*iGlobalTime)/(distToCam*0.5);
    float ymodif = sin(iGlobalTime*4.0+p.z*1.5)*0.6/(distToCam*0.5);
    float xmodif = cos(iGlobalTime*4.0+p.z*1.3)*0.6/(distToCam*0.5);
	float y = 0.4+0.03*dz*10.0/(distToCam*0.5);
	float z = 0.0;
	
    vec3 ref = vec3(xThickness, yThickness, len);
//    rX(ref, camRot.y);
	float leg1 = length(max(abs(p-vec3(x-xmodif,y-ymodif,z))-ref,vec3(0.0)));
	float leg2 = length(max(abs(p-vec3(-x+xmodif,y+ymodif,z))-ref,vec3(0.0)));
	float leg3 = length(max(abs(p-vec3(y+ymodif,-x-xmodif,z))-ref,vec3(0.0)));
	float leg4 = length(max(abs(p-vec3(y-ymodif,x+xmodif,z))-ref,vec3(0.0)));
    float head = creatureHead(p+vec3(x,y-0.5,z-len*1.2), len*0.5);
    float minleg = min(leg1,leg2);
    minleg = min(minleg,leg3);
    minleg = min(minleg,leg4);
    return min(head,minleg);
}


float myscene(in vec3 _p, in float _f)
{
	distToCam = length(rmdata.p - rmdata.camera);

	float bc = 3.0;
//	vec3 modulus = vec3(2.5+1.23*cos(iGlobalTime*0.25), 2.5+1.23*sin(iGlobalTime*0.23), 2.5);
	vec3 modulus = vec3(5.5,5.5,5.5);
	vec3 p = _p;
	float f = abs(_f) * (0.5+abs(cos(_p.z*1.0 + iGlobalTime * 0.25)));
//	p.x += iGlobalTime*0.1;
//	p.y /= max(sqrt(_p.x), 1.0);
	vec3 p2 = abs(mod(p,modulus));
	float v1 = cos(iGlobalTime)+cos((p.x+p.y)*6.0);
//	float sph = abs(sdCylinder(p2, vec3(v1, v1, 1.0)));
	float sph = abs(cos(p2.x))+abs(sin(p2.y))+abs(cos(p2.z)) + shaping.z * 0.1 * v1;
	float pp = mix(p.x,p.y,abs(cos(iGlobalTime*0.2)));
	float d1 = pow(abs(cos(sqrt(2.0*pp+4.0*abs(sin(iGlobalTime*0.12))))), 3.0);
	float little = d1;
	
	colorAmount += 1.0;
	#ifdef USE_TEXTURE_COL
		vec3 rgb1 = texRatio.y * texture2D(uSampler1, sph*(_p.xz+_p.yz)*0.00015).rgb;
		vec3 rgb2 = texRatio.y * texture2D(uSampler7, sph*(_p.xz+_p.yz)*0.00015).rgb;
        vec3 rgb = (textratio*rgb1)+((1.0-textratio)*rgb2);
		rmdata.globalCol += rgb*little*_f*0.2;
//		rmdata.globalCol += floor(mod(length(p), 1.0) + 0.09) + abs(p.z) * dustLevel / (_f + 0.00001);

		vec3 xlight, ylight;

		float modval = dustSpacing * 0.2;
		float chromaval = modval * 0.02;
        float yplanemodifier = texture2D(uSampler0, p.xz*0.25).x;
		float ofs = 2.0*dustSpeed*iGlobalTime + yplanemodifier;
		ylight.r = min(dustAlpha.y*max(mod(abs(ofs+p.y),modval) - dustLevel*modval, 0.0)/dustSpacing, 1.0);
		ylight.g = min(dustAlpha.y*max(mod(abs(ofs+p.y),modval+chromaval*0.5*dustChroma) - dustLevel*modval, 0.0)/dustSpacing, 1.0);
		ylight.b = min(dustAlpha.y*max(mod(abs(ofs+p.y),modval+chromaval*1.0*dustChroma) - dustLevel*modval, 0.0)/dustSpacing, 1.0);
    	ylight *=  yplanemodifier*1.0;

		modval = dustSpacing * 10.5;
		chromaval = modval * 0.05;
		xlight.r = min(dustAlpha.y*max(mod(abs(ofs+p.z),modval) - dustLevel*modval, 0.0)/dustSpacing, 1.0);
		xlight.g = min(dustAlpha.y*max(mod(abs(ofs+p.z),modval+chromaval*0.5*dustChroma) - dustLevel*modval, 0.0)/dustSpacing, 1.0);
		xlight.b = min(dustAlpha.y*max(mod(abs(ofs+p.z),modval+chromaval*1.0*dustChroma) - dustLevel*modval, 0.0)/dustSpacing, 1.0);

		rmdata.globalCol += 0.05*cos(xlight*3.14159);
		rmdata.globalCol += 0.75*ylight;
    	float creature = SeaCreature(p - rmdata.camera, 10.0, 0.01, 0.01);
        if (creature<sph) {
            sph = creature;
    		rmdata.globalCol += min(1.0,(distToCam*0.051))*vec3(0.9,0.0,1.9);
        }
		return sph*(1.0-beatBarFader)*0.15 + (min(sph,shaping.x * little) + (rgb.r+rgb.g+rgb.b)*shaping.y*0.111)*(beatBarFader); //min(iGlobalTime*0.1, 1.0)
	#else
		rmdata.globalCol += vec3(d1/(f+0.00001), d2(f+0.00001), d3(f+0.00001));
		return min(sph,little);
	#endif // USE_TEXTURE_COL
	
}


vec3 col_haze(Hit hit)
{
	vec3 c1 = texture2D(uSampler3, rmdata.frag).xyz;
	vec3 c2 = texture2D(uSampler4, rmdata.frag).xyz;
	vec3 c3 = texture2D(uSampler5, rmdata.frag).xyz;
	vec3 col = computeColor();
    float vignette = max(beatBarFader,1.0-length(rmdata.frag-vec2(0.5,0.5))*0.75);
    vignette *= min(1.0, remaining * 0.2);
    //(1.0-0.65*rmdata.frag.y)
	return ((col + c1 * trailWeight.r + c2 * trailWeight.g + c3 * trailWeight.b)/trailWeight.a * rmdata.fogFactor) * vignette;
}

void startFrame()
{
	rmdata.globalCol = vec3(0.0, 0.0, 0.0);
	colorAmount = 0.0;
}

vec3 hazeNormal(vec3 p, float d)
{
	return vec3(0.0,0.0,1.0);
}
