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

#define	RAYMARCH_ITERATION_HOP		s += f*0.003;
#define	RAYMARCH_STEP_SCALE			0.99
#define RAYMARCH_EPSILON 			0.001
#define	RAYMARCH_MAX_ITER 			32
#define	RAYMARCH_MAX_DIST			10.0
#define RAYMARCH_OVERLOAD_COMPUTE_COLOR
#define	RAYMARCH_RAY_START_MIN_DIST 0.25

//#define USE_MASKING
#define SCENE myscene(_p, _d)
#define MIN_CAM_DIST 0.0 // 1.0
#define MAX_ITER 64
#define COLLISION_EPSILON 0.1
#define START_DIST 3.0
#define COLORIZE computeColor
#define START_FX_FRAME startFrame();


#define CAMERA_LENS_DISTORTION drops = texture2D( uSampler5, rmdata.frag + vec2(1.0, iGlobalTime*0.011)); vec4 waternormal = clamp(cos(0.55*iGlobalTime+(rmdata.frag.x+rmdata.frag.y)*10.0), 0.0, 0.5)*pow(1.0-rmdata.frag.y,2.0)*(drops); rmdata.dir = normalize(rmdata.dir + 1.0/(1.0*length(waterDrops.yz-(rmdata.frag))+1.0)*waterDrops.x*waternormal.xyz);

//parameters
#define FOG_END 20.0
uniform vec2 noise1Spd;
uniform vec2 noise2Spd;
uniform vec3 ScrollSpd;
uniform float noise1Base;
uniform float noise2Scale;
uniform float noise2Base;
uniform float noise1Scale;
uniform float waveHeightSpd;
uniform float waveHeightStrength;
uniform float minWaveHeight;
uniform float noise1W;
uniform float noise2W;
uniform vec4 underLightPos;
uniform vec3 waterDrops;

#define COLLISION_TEST
#define SKIP_FARTEST
#define FOAM_SPD 0.25

// local variables
vec4 drops;
float altitude;
vec3 colorAccu;
float colorAmount;
float iterCount;
vec3 clouds;



vec3 computeColor(Hit hit) {
    rmdata.globalCol = colorAccu/colorAmount + max(max(drops.x,drops.y), drops.z) * 0.051;
	return rmdata.globalCol*1.25;
}


// Noise functions...
float Hash( float n )
{
	return  texture2D( uSampler1, vec2(n*.27, n*.26), -100.0 ).x;
}

//--------------------------------------------------------------------------
vec2 Hash2(float n)
{
	return texture2D( uSampler1, vec2(n*.077331, n*.066927), -100.0 ).xz;
}


float noise( in vec2 x )
{
    vec2 p = floor(x);
    vec2 f = fract(x);
    f = f*f*(3.0-2.0*f);
    float n = p.x + p.y*57.0;
    float res = mix(mix( Hash(n+  0.0), Hash(n+  1.0),f.x),
                    mix( Hash(n+ 57.0), Hash(n+ 58.0),f.x),f.y);
    return res;
}
float FractalNoise(in vec2 xy)
{
	float w = noise1W;
	float f = 0.0;
	float norm = 0.0;
	float mult = 0.4*(1.0+0.3*abs(sin(rmdata.p.z)))+abs(sin(rmdata.p.x*0.01));
	for (int i = 0; i < 4; i++)
	{
		f += noise(xy) * w;
		norm += w;
		w *= 0.5;
		xy *= mult;
	}
	return f / norm;
}

float FractalNoise2(in vec2 xy, in float n1)
{
	float w = noise2W * abs(n1);
	float f = 0.0;
    //float mult = 0.4*(1.0+0.3*abs(cos(rmdata.p.z*1.2)));
	float mult = noise2Base+noise2Scale*(abs(cos(rmdata.p.z*1.2))+abs(sin(0.04*iGlobalTime*noise2Spd.x+xy.x*0.05))*abs(cos(0.04*iGlobalTime*noise2Spd.y+xy.y*0.05)));
	float norm = 0.0;
	for (int i = 0; i < 4; i++)
	{
		f += noise(xy) * w;
		norm += w;
		w *= 0.5;
		xy *= mult;
	}
	return f / norm;
}

float terrainH( vec3 p )
{
    float wavescale = 1.5;
	vec2 pos = wavescale*vec2(p.x*0.5, p.z*0.75 + iGlobalTime*0.025*FOAM_SPD);
	float n1 = FractalNoise(pos);
	float n2 = FractalNoise2(pos, n1);
	n1 = clamp(max(0.0,n1-0.75)*6.0, 0.0, 0.99999);
	n2 = clamp(max(0.0,n2-0.75)*6.0, 0.0, 0.99999);
	altitude = (n2*0.5+n1)*0.5;
    float sum = 10.0*altitude ;//* (3.0+cos(-iGlobalTime*waveHeightSpd+p.z+iterCount*waveHeightStrength));
    return sum;
}


//Object
float myscene(in vec3 p, in float f)
{ 		
    float maxDvalue = 1.0;
    float cylRad = 5.0;
    float maxsd = 35.0;
    vec3 relcam = p-rmdata.camera;
	float sd = sdCylinder(vec3(relcam.z+cylRad*0.5*(1.0+sin(-0.25*iGlobalTime+relcam.z*0.2)), relcam.y, relcam.x+cylRad*0.5*(1.0+cos(3.14-0.25*iGlobalTime+relcam.z*0.3))), vec3(0.051,1.0,0.051));
    sd = min(sd*2.8,maxsd);
	vec3 p2 = vec3(p.x, p.y-sd, p.z);
//	vec3 p2 = p;
	float d = 1.1*altitude+p2.y-terrainH(p2);
 //   if (d<10.0) {
		colorAmount += (0.075 * sd+1.0);
        vec4 foam = texture2D( uSampler0, vec2(p.x, p.z+FOAM_SPD*iGlobalTime)*vec2(0.15+0.05*cos(p.z),0.4));
        foam.rgb = pow(vec3(1.0+foam.rgb), vec3(4.0)) * 0.15;
        altitude *= 1.0+rmdata.dist*0.08*(1.0-foam.b)/max(1.0,altitude+(rmdata.p.z-rmdata.camera.z)*0.5);
        altitude *= 2.75;
		//colorAccu += dFactor*(foam.rgb*30.0/rmdata.dist)*0.5*
     //   vec3 baseCol = texture2D( uSampler2, vec2(clamp(0.0, 1.0, altitude / max(f/FOG_END,4.0)), 1.0) ).xyz;
        altitude = max(altitude,0.3);
        vec3 baseCol = vec3(clamp(0.4, 1.0, altitude / max(f/FOG_END,4.0)));
        colorAccu += 7.0*vec3(0.7,0.8,1.0)*(baseCol*foam.rgb);
/*
        vec3 lp = underLightPos.xyz;
//        float dist = length(lp.xyz-(rmdata.p.xyz-rmdata.camera.xyz));
        float dist = length(lp.xz-(rmdata.p.xz-rmdata.camera.xz));
        dist = 1.0-pow(clamp(dist,0.0,1.0), 2.0);
        colorAccu += 0.5*dist*vec3(0.6,0.6,1.0);
        */
//	}
	return d*0.1;//minWaveHeight+d*0.25;
}

void startFrame() {
		rmdata.globalCol = vec3(0.0, 0.0, 0.0);
        colorAccu = vec3(0.0,0.0,0.0);

        colorAmount = 0.0;
        clouds = vec3(0.0,0.0,0.0);
        iterCount = 0.0;
}
