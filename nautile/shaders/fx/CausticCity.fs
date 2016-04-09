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

#define SCENE myscene(_p, _d)
#define COLORIZE mycol
#define COMPUTE_NORMAL normal

#define MAX_ITER 256
#define COLLISION_EPSILON 0.0001
#define FOG_FAR 1000.0
#define MARCH h.d*0.5

uniform float   radius;
uniform vec3    repeat;
uniform vec2    fatEdges;
uniform float   cityLights;
uniform vec3    edgesColor;
uniform vec2    lightPos;
uniform float   beatBarFader;


uniform float   texratio;

vec3 rpt;
float creatureInfluence;
vec3 creatureCol;
float distToCam;

float udRoundBox( vec3 p, vec3 b, float r )
{
  return length(max(abs(p)-b,0.0))-r;
}




vec3 mycol(Hit hit)
{
    vec2 edges = fatEdges;
    vec3 medgesColor = edgesColor;
    edges.x = (1.0+cos(iGlobalTime*0.5 + rmdata.p.x*0.6))*0.01;
    edges.y = 0.005;//(1.0+sin(iGlobalTime*0.4 + rmdata.p.z*0.6))*0.01;
    medgesColor = rmdata.globalCol*2.0;//vec3(1.0,1.0,1.0);
	vec4 prepassData0 = texture2D(uSampler1, rmdata.frag);
	vec4 prepassData1 = texture2D(uSampler1, rmdata.frag+vec2(edges.x, 0.0));
	vec4 prepassData2 = texture2D(uSampler1, rmdata.frag+vec2(-edges.x, 0.00));
	vec4 prepassData3 = texture2D(uSampler1, rmdata.frag+vec2(0.01, 0.0));
	vec4 prepassData4 = texture2D(uSampler1, rmdata.frag+vec2(-0.015, 0.0));
    float dist = abs(prepassData1.x-prepassData0.x);
    dist += abs(prepassData2.x-prepassData0.x);
    dist += abs(prepassData3.x-prepassData0.x);
    dist += abs(prepassData4.x-prepassData0.x);
    dist *= 3.0;
   // dist += max(0.0,500.0-rmdata.dist)*max(0.0,dist*0.25)*cityLights*sin(rmdata.p.z*0.1-rmdata.dist*0.025);
	vec3 n = COMPUTE_NORMAL(rmdata.p, rmdata.dist);
	float diffuse = diffuseIntensity*max(0.0, abs(dot(n, lightPosNormalized)));
	vec3 ref = normalize(reflect(rmdata.dir, n));
	float specular = specularIntensity*pow(max(0.0, dot(ref, lightPosNormalized)), specularFallOff);
	vec3 col = (rmdata.globalCol + dist*medgesColor + diffuse * diffuseColor + specular * specularColor + rmdata.curIterCount*1.1);
    float distboost = clamp(0.1, 1.0, (rmdata.dist-200.0)*0.005); // depth vignetting
    col *= 1.0+2.0*max(0.5, 1.0-distboost)*(abs(n.x)*texture2D(uSampler4, rmdata.p.zy*0.006).xyz + abs(n.z)*texture2D(uSampler4, rmdata.p.xy*0.006).xyz); // buildings texturing
    vec3 refl = reflect(rmdata.dir,n);
    vec4 fakeEnvMap = texture2D(uSampler0, (refl.xy+refl.xz) * rmdata.dist * 0.0025);
    col *= vec3(0.15)+fakeEnvMap.xyz;
    float vignette = length(rmdata.frag+vec2(-0.5,-0.5)); // screen vignetting
    creatureCol = vec3(distboost)*creatureCol;
    vec3 ret = (1.0-creatureInfluence)*col* rmdata.fogFactor+creatureInfluence*creatureCol;
    ret *= max(0.0,1.0-pow(vignette,3.0));
    ret.z = max(ret.z,min(0.1,0.1/(5.0*vignette)));

     vec2  lbuv = (rmdata.frag+lightPos)*vec2(iResolution.x, iResolution.y)/(iResolution.x+iResolution.y)*5.0;
     float radchange = max(0.2, 6.0*abs(lightPos.y+0.5));
     lbuv /= radchange; // makes light smaller as it reaches the center of the scren
     float showLightBeam = max(0.0, pow(1.0-length(lbuv), 3.0));
     vec3 beamCol = vec3(0.6,0.6,1.0) * radchange * 0.5;
     vec3 lightbeamCol = beamCol*showLightBeam/(max(0.0,radchange*50.0+600.0-rmdata.dist)+1.0); 


//    return vec3(showLightBeam);
 //   rmdata.globalCol =  texture2D(uSampler2, rmdata.frag).xyz;
  //  return  ret;
    return  ((1.0-creatureInfluence)*col+creatureInfluence*creatureCol)* rmdata.fogFactor+(lightbeamCol*(1.0+beatBarFader));
}

void animPlankton(inout vec3 p, float a) {
	float c,s;vec3 q=p;
	c = cos(a); s = sin(a);
	p.x = 0.25* (c * q.x * 2.0 - s * q.y);
	p.y = 0.25* (s * q.x + c * q.y);

//	p.z += (s * q.y + c * q.z * 0.5)*0.0025;
}

float sdCappedCylinder( vec3 p, vec2 h )
{
  vec2 d = abs(vec2(length(p.xz),p.y)) - h;
  return min(max(d.x,d.y),0.0) + length(max(d,0.0));
}

float sdCapsule( vec3 p, vec3 a, vec3 b, float r )
{
    vec3 pa = p - a, ba = b - a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
    return length( pa - ba*h ) - r;
}

float SeaCreature ( vec3 _p, float len, float xThickness, float yThickness) {
    vec3 p = _p + vec3(10.0,12.0,30.0);
    len = min(len,len*max(0.0,distToCam-450.0));
	
    vec3 ref = vec3(xThickness, yThickness, len);
//    rX(ref, camRot.y);
	return length(max(abs(p-vec3(0.4*cos(iGlobalTime*2.0+p.z*0.05), 0.4*sin(iGlobalTime*2.0+p.z*0.05), 0.0))-ref,vec3(0.0)));
}

float myscene (vec3 _p, float _d) {
	distToCam = abs(rmdata.p.z - rmdata.camera.z);
    rpt = vec3(125.0, 1000.0, 125.0);
    float modx = ceil(abs(_p.x)/rpt.x);
    float mody = ceil(abs(_p.y)/rpt.y);
    float modz = ceil(abs(_p.z)/rpt.z);
    _p.y += abs(cos(iGlobalTime*0.05 + modx)+sin(iGlobalTime*0.06 + modz)) * 80.0;
    vec2 rounding = vec2(0.99*modx, 0.99*modz);
    vec4 pix = texture2D(uSampler2, rounding );
    vec4 pix2 = texture2D(uSampler3, rounding );
    pix = (texratio*pix + (1.0-texratio)*pix2);
 	vec3 p0 = opRep(_p, rpt);

//    _p.y += 1.74*sin(_p.x+iGlobalTime)+0.25*(iGlobalTime+rmdata.dist*0.25);//iGlobalTime*23.0+54.0*(1.0+abs(cos(modz*40.0)))+53.0*(1.0+abs(sin(modx*40.0)));
    vec3 sphrpt = vec3(rpt.x, 95.0, rpt.z*2.0)*0.27;
    animPlankton(_p, abs(min(1.5,1.0+cos((rounding.x+rounding.y)*10.0)*2.0)+0.2*(mody+modx+modz+max(rmdata.dist-300.0,0.0)*0.02))*(max(rmdata.dist-100.0,0.0)*0.00025));
 	vec3 sphp0 = opRep(_p, sphrpt);
    sphp0.z += 10.0+sphp0.y;
    float infl = 1.0-(max(0.0, max(0.0,450.0-(rmdata.p.z-rmdata.camera.z-150.0))) / 450.0);
    float sph = sdSphere(sphp0, infl*1.0);
	float creature = SeaCreature(vec3(sphp0.y,sphp0.x,sphp0.z*2.0+10.0), 30.0, 0.15, 0.15);
    sph = min(creature,sph);
    p0.x += sph*max(0.0,rmdata.dist-700.0)*0.001;
    float groundy = min(400.0, (600.0+200.0*sin(iGlobalTime*0.3+modz+beatBarFader*0.05))*pix.y);
    float cub = sdBox(p0, vec3(rpt.x*(pix.x*0.4), groundy, rpt.z*(pix.z*0.4)));

//    float sph = sdCappedCylinder(sphp0, vec2(1.0, 5.0));

//    creatureInfluence = 1.0-min(ceil(creature), 1.0);
    creatureCol = vec3(0.9,1.0,0.9) * (1.0-min(sph*5.0, 1.0)) * 0.5;
    creatureInfluence = 1.0-min(sph, 1.0);
    rmdata.globalCol = pix.rgb * 2.25;

    //return min((2.0*_p.y+1000.0),min(sph, cub));
//    return sph;
    return min(sph, cub);
}
