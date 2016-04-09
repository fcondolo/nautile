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

#define SHOW_WATER

#define SCENE myscene(_p, _d)
#define MIN_CAM_DIST 0.0 // 1.0
#define MAX_ITER 128
#define COLLISION_EPSILON 0.05
#define START_DIST 3.0
#define COLORIZE col_cub
#define START_FX_FRAME startFrame();
//#define BUMPS
//#define COLLISION_TEST if (h.d < COLLISION_EPSILON && allowBreak == 0) break;
#define MARCH h.d*0.75

#define treeRadVariation1	0.6
#define treeRadVariation2	184.0
#define treeRadius			1.0

float distToCam;

int allowBreak = 0;
float skipDist  =0.0;
vec3 specLightPos = vec3(1.0,0.0,0.0);
uniform vec4    trailWeight; // 0.5, 0.4, 0.3, 2.0
uniform vec2    lightPos;
uniform float   cubeFactor;
uniform float   beatBarFader;
uniform float   baseEcart;
uniform float   lightPlane;
uniform sampler2D uSampler6;
uniform vec3    creaturePos;

float           cubeFactor2;

//float extraCub;


 	


float creatureHead(vec3 p, float r)
{
    float mvt = abs(cos(iGlobalTime+p.z));
    float xyScale = 0.5*sin(p.z*1.0+iGlobalTime);
	return length(vec3(p.x*2.0+xyScale,p.y*3.0+xyScale,p.z*(1.0+0.5*mvt)))-r;
}

float SeaCreature ( vec3 _p, float len, float xThickness, float yThickness) {
    vec3 p = _p + creaturePos;

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
    float head = creatureHead(p+vec3(x,y-0.5,z-len*1.2), len*0.3);
    float minleg = min(leg1,leg2);
    minleg = min(minleg,leg3);
    minleg = min(minleg,leg4);
    return min(head,minleg);
}

vec3 col_cub(Hit hit)
{
	vec3 n = normal(rmdata.p, rmdata.dist);
	float diffuse = diffuseIntensity*max(0.0, dot(n, specLightPos));
	vec3 ref = normalize(reflect(rmdata.dir, n));
	float specular = specularIntensity*pow(max(0.0, dot(ref, specLightPos)), specularFallOff);
	vec3 spec = (diffuse * diffuseColor + specular * specularColor) / 3.0;

	#ifndef BLUR
		#ifdef ZOOM
			vec3 c1 = texture2D(uSampler3, 0.5+(rmdata.frag-0.5)*0.9).xyz;
			vec3 c2 = texture2D(uSampler4, 0.5+(rmdata.frag-0.5)*0.75).xyz;
			vec3 c3 = texture2D(uSampler5, 0.5+(rmdata.frag-0.5)*0.5).xyz;
		#else
			vec3 c1 = texture2D(uSampler3, rmdata.frag).xyz;
			vec3 c2 = texture2D(uSampler4, rmdata.frag).xyz;
			vec3 c3 = texture2D(uSampler5, rmdata.frag).xyz;
		#endif
	#endif
	//vec3 col = rmdata.globalCol * spec * 0.2;
	vec3 col = rmdata.globalCol * 0.45 * (1.0-min(rmdata.p.y*0.025, 1.0));
	col += min(pow(specular, 3.0), 0.7);
	col *= rmdata.fogFactor;
	vec3 noblur =  col;//((col + c1 * trailWeight.r + c2 * trailWeight.g + c3 * trailWeight.b)/trailWeight.a);
    /*
	float dx = 2.0/iResolution.x;
	float dy = 2.0/iResolution.y;
	vec3 blur = (col*2.0 +
		texture2D(uSampler3, rmdata.frag-vec2(dx, 0.0)).xyz +
		texture2D(uSampler3, rmdata.frag+vec2(dx, 0.0)).xyz +
		texture2D(uSampler3, rmdata.frag-vec2(0.0, dy)).xyz +
		texture2D(uSampler3, rmdata.frag+vec2(0.0, dy)).xyz +
		vec3 (0.0,0.0,0.2)
	) / 6.0;
	*/
	//blur *=0.25;
	float nearRatio = 1.0-clamp(distToCam*0.05,0.0,1.0);
//	FRACTURE NETTE VS SMOOTH
//	nearRatio = max(nearRatio-0.5, 0.0);
//	nearRatio = min(nearRatio*99999.9,1.0);

    // godrays emitting light
     vec2  lbuv = (rmdata.frag+lightPos)*vec2(iResolution.x, iResolution.y)/(iResolution.x+iResolution.y)*5.0;
     float radchange = 1.0;//max(0.2, 6.0*abs(lightPos.y+0.5));
    // lbuv /= radchange; // makes light smaller as it reaches the center of the scren
     float showLightBeam = max(0.0, pow(1.0-length(lbuv), 3.0));
     vec3 beamCol = vec3(0.6,0.6,1.0) * radchange * 0.5;
//     vec3 lightbeamCol = beamCol*showLightBeam/(max(0.0,radchange*50.0+1.0-rmdata.dist)+1.0); 
     vec3 lightbeamCol = max(0.0, rmdata.dist-30.0)*beamCol*showLightBeam;///(max(0.0,radchange*50.0-rmdata.dist)+1.0); 

	return vec3(0.75,0.75,1.0)*(noblur+lightbeamCol)/(rmdata.dist*0.1);// * nearRatio + blur * (1.0-nearRatio);
}


float myscene (vec3 _p, float _d) {
	// TREES
	
	vec3 p = _p;
	vec3 fp = floor(_p);
	distToCam = length(rmdata.p - rmdata.camera);
//	p = mix(_p, fp, clamp(-12.0*abs(cos(iGlobalTime*0.2))+distToCam*0.5, 0.0, 1.0));
	p = mix(_p, fp, min(cubeFactor*cubeFactor2, 1.0));
	
	p.x += clamp(distToCam, 0.0, 2.0);
	
	p.y += 2.0;
	float sc = 0.001;

    vec3 repSize =  vec3(8.0, 10.0, 8.0);
	vec3 p0 = opRep(p, repSize);
	p0.x += 2.0*cos((p.z-p0.z)*8.0);
	float treeRad = treeRadius; // base radius
	//float radmodif = clamp(p.y*0.2, 0.0, 3.14159*0.5); // clamp sinus input between 0 and PI/2
	//treeRad -= sin(radmodif)*treeRadVariation1*abs(sin((p.x-p0.x)*treeRadVariation2));
	float cyl = abs(sdCylinder(p0, vec3(cos((p.x+p.z+p.y)*0.2+iGlobalTime), min(iGlobalTime*0.91,1.0), treeRad )))+cubeFactor*cubeFactor2*0.5*cos(_p.y+iGlobalTime);
	allowBreak = 0;
	skipDist = 0.0;
//	if (cyl<0.3) {allowBreak = 1;skipDist = treeRad; return cyl;}

	// PARTICLES
	vec3 pp = p+vec3(0.2*cos(p.x+p.z+2.0*p.y+iGlobalTime*0.1), p.z-iGlobalTime, 0.2*sin(2.0*p.y+iGlobalTime*0.1));
	vec3 pQ = opRep(pp, vec3(0.6 + 0.2*sin(iGlobalTime*0.04)));
	float particles = sdSphere(pQ, 0.01);

    vec3 yplanemodifierCol = texture2D(uSampler6, rmdata.p.xz*0.25).xyz;
	float creature = SeaCreature(p - rmdata.camera, 12.0, 0.01, 0.01);
	vec3 creatureCol = vec3(1.75,0.2,1.0);
//	vec3 creatureCol = vec3(0.3,1.0,0.3);
 //   particles *= 0.1*creature;
    cyl += max(0.0, (1.0+yplanemodifierCol.x)-creature*0.5);
    cyl += max(0.0, 5.0-rmdata.dist);
  //  rmdata.globalCol += creatureCol * max(0.0, 2.0-creature) * 0.1;




	// COLOR
	vec3 texel = texture2D(uSampler5, vec2(p.x*0.5, p.y*0.5) ).xyz;
	vec3 treeCol = texel;// *(min(1.0,cyl));
	
	// Rayons - Y
	float baseEcartX = baseEcart;//4.0+1.0*aframeSin2;
	float baseEpaisseurX = baseEcartX*14.6/15.0;//(0.8+0.4*frameSin);
    float yplanemodifier = yplanemodifierCol.x;
    float planey = /*10.0 * (floor(p.x/repSize.x) + floor(p.z/repSize.z)) + yplanemodifier + */ abs(-2.0*iGlobalTime+rmdata.p.y);
    vec3 lightPlaneCol = vec3( yplanemodifier * lightPlane*max(mod(planey,baseEcartX)-baseEpaisseurX, 0.0),
	                        yplanemodifier * lightPlane*max(mod(planey,baseEcartX+0.10)-baseEpaisseurX, 0.0),
	                        yplanemodifier * lightPlane*max(mod(planey,baseEcartX+0.20)-baseEpaisseurX, 0.0));
//    extraCub = lightPlaneCol.x;
//#ifdef BUMPS
//	cyl *= particles;
// CUT TREES WITH CREATURE
	cyl -= particles*0.75/max(1.0,(p.y-rmdata.camera.y)*0.5);
    float modif = 0.2*max(0.0,1.0-particles*4.5+cubeFactor*cubeFactor2*0.1);
	rmdata.globalCol += modif*vec3(0.6,0.6,1.0);
    rmdata.globalCol *=	1.0+ 5.0*modif*texture2D(uSampler4, vec2(p.x*0.1, p.z*0.1) ).x*rmdata.fogFactor*(1.0+1.0*beatBarFader+2.0*max(cubeFactor*cubeFactor2-0.5,0.0));
    //cyl -= lightPlane.x*0.1;
//#else
//	cyl -= particles*0.75;
//#endif

	float ret = min(creature, cyl);

    if (creature < cyl) {
    	rmdata.globalCol += treeCol * 0.1 + creatureCol * 0.1;
        if (creature < 1.0) cubeFactor2 = 0.0;
    } else {
	    rmdata.globalCol += treeCol * 0.09;
    }

		
	rmdata.globalCol += lightPlaneCol;

	return ret;
}



void startFrame() {
		rmdata.globalCol = vec3(0.0, 0.0, 0.0);
		specLightPos = rmdata.camera / length(rmdata.camera);
        cubeFactor2 = 1.0;
}