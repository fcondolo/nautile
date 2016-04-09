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

#ifndef RAYMARCH_ITERATION_HOP
	#define	RAYMARCH_ITERATION_HOP s += f*0.003;
#endif

#ifndef RAYMARCH_STEP_SCALE
	#define	RAYMARCH_STEP_SCALE 0.95
#endif

#ifndef RAYMARCH_EPSILON
	#define RAYMARCH_EPSILON 0.001
#endif

#ifndef RAYMARCH_MAX_ITER
	#define	RAYMARCH_MAX_ITER 256
#endif

#ifndef RAYMARCH_MAX_DIST
	#define	RAYMARCH_MAX_DIST 50.0
#endif

#ifndef RAYMARCH_RAY_START_MIN_DIST
	#define	RAYMARCH_RAY_START_MIN_DIST 0.1
#endif

uniform float RaymarchMinDistDistortion;






float raymarching(
  in vec3 prp,
  in vec3 scp,
  in float precis,
  in float startf,
  in float maxd,
  out int objfound)
{ 
  const vec3 e=vec3(0.1,0,0.0);
  float s=startf;
  vec3 c,p,n;
  float f=startf;
  objfound=1;
  iterCount = 0.0;
  p = prp + RaymarchMinDistDistortion * scp;
  float eps = precis;
  for(int i=0;i<RAYMARCH_MAX_ITER;i++){
	f+=s;
	p+=s*scp;
	s = RAYMARCH_STEP_SCALE * obj(p, f);
	iterCount += 1.0;
	RAYMARCH_ITERATION_HOP
  }

  objfound=-1;
  return f;
}

vec3 camera(
  in vec3 prp,
  in float vpd)
{
  vec2 vPos=-1.0+2.0*frag;
  vec3 vpn=normalize(-prp);
  vec3 u=normalize(vec3(1.0,0.75*cos(iGlobalTime*0.1),-0.75*sin(iGlobalTime*0.1)));//normalize(cross(iCameraUpVector, vpn));
  vec3 v=vec3(0.0, 1.2, -0.9);//cross(vpn,u);
  vec3 scrCoord=prp+vpn*vpd+vPos.x*u*iResolution.x/iResolution.y+vPos.y*v;
  return normalize(scrCoord-prp);
}


vec3 render(
  in vec3 prp,
  in vec3 scp,
  in float precis,
  in float startf,
  in float maxd,
  in vec3 background,
  out vec3 p,
  out float f,
  out int objfound)
{ 
  objfound=-1;
	iterCount = 0.0;
  f=raymarching(prp,scp,precis,startf,maxd,objfound);
	p=prp+scp*f;
	vec3 terrain = computeColor();
	return terrain;
}

void main(){
 frag = vec2(gl_FragCoord.xy/iResolution.xy);

#ifdef USE_MASKING
	vec4 mskCol = texture2D(uSampler0, frag);
	if (mskCol.a > 0.999) {
		gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
} else 
#endif // USE_MASKING        
{

  colorAccu = vec3(0.0,0.0,0.0);
  colorAmount = 0.0;
  clouds = vec3(0.0,0.0,0.0);
  vec3 scp=camera(camPos,1.5);
  vec3 n,p;
  float f;
  int o;
  const float startf=RAYMARCH_RAY_START_MIN_DIST;
  const vec3 backc=vec3(0.8,0.9,1.0);
  
  vec3 c1=render(camPos,scp,RAYMARCH_EPSILON,startf,RAYMARCH_MAX_DIST,backc,p,f,o);
 // c1 += clouds * 0.5;
  gl_FragColor = vec4(c1.xyz,1.0);				
}			
}
