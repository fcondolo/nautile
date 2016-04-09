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

const int AO_SAMPLES = 3;
const vec2 AO_PARAM = vec2(1.2, 3.8);
const vec2 CORNER_PARAM = vec2(0.25, 40.0);
const float INV_AO_SAMPLES = 1.0 / float(AO_SAMPLES);

const float TRESHOLD 	= 0.1;
const float EPSILON 	= 1e-4;
const float LIGHT_INTENSITY = 0.15;
const vec3 WHITE 	= vec3(1.0,1.0,1.0) * LIGHT_INTENSITY;

const float DISPLACEMENT = 0.1;

//vec3 seeds;
float distToCam, iterCount;
vec3 constCol;
uniform sampler2D uSampler0;
uniform sampler2D uSampler1;
uniform sampler2D uSampler2;
vec3 ori;
vec3 raydir;
vec2 q;

vec3 opRep( vec3 p, vec3 c )
{
    return mod(p,c)-0.5*c;
}

// math
mat3 fromEuler(vec3 ang) {
	vec2 a1 = vec2(sin(ang.x),cos(ang.x));
    vec2 a2 = vec2(sin(ang.y),cos(ang.y));
    vec2 a3 = vec2(sin(ang.z),cos(ang.z));
    mat3 m;
    m[0] = vec3(a1.y*a3.y+a1.x*a2.x*a3.x,a1.y*a2.x*a3.x+a3.y*a1.x,-a2.y*a3.x);
	m[1] = vec3(-a2.y*a1.x,a1.y*a2.y,a2.x);
	m[2] = vec3(a3.y*a1.x*a2.x+a1.y*a3.x,a1.x*a3.x-a1.y*a3.y*a2.x,a2.y*a3.y);
	return m;
}
float hash12(vec2 p) {
	float h = dot(p,vec2(127.1,311.7));	
    return fract(sin(h)*43758.5453123);
}

// 3d noise
float noise_3(in vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);	
	vec3 u = f*f*(3.0-2.0*f);
    
    vec2 ii = i.xy + i.z * vec2(5.0);
    float a = hash12( ii + vec2(0.0,0.0) );
	float b = hash12( ii + vec2(1.0,0.0) );    
    float c = hash12( ii + vec2(0.0,1.0) );
	float d = hash12( ii + vec2(1.0,1.0) ); 
    float v1 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
    
    ii += vec2(5.0);
    a = hash12( ii + vec2(0.0,0.0) );
	b = hash12( ii + vec2(1.0,0.0) );    
    c = hash12( ii + vec2(0.0,1.0) );
	d = hash12( ii + vec2(1.0,1.0) );
    float v2 = mix(mix(a,b,u.x), mix(c,d,u.x), u.y);
        
    return max(mix(v1,v2,u.z),0.0);
}

// fBm
float fbm3(vec3 p, float a, float f) {
    return noise_3(p);
}

float fbm3_high(vec3 p, float a, float f) {
    float ret = 0.0;    
    float amp = 1.0;
    float frq = 1.0;
    for(int i = 0; i < 4; i++) {
        float n = pow(noise_3(p * frq),2.0);
        ret += n * amp;
        frq *= f;
        amp *= a * (pow(n,0.2));
    }
    return ret;
}

// lighting
float diffuse(vec3 n,vec3 l,float p) { return pow(max(dot(n,l),0.0),p); }
float specular(vec3 n,vec3 l,vec3 e,float s) {    
    float nrm = (s + 8.0) / (3.1415 * 8.0);
    return pow(max(dot(reflect(e,n),l),0.0),s) * nrm;
}

// distance functions
float plane(vec3 gp, vec4 p) {
	return dot(p.xyz,gp+p.xyz*p.w);
}
float sphere(vec3 p,float r) {
	return length(p)-r;
}
float capsule(vec3 p,float r,float h) {
    p.y -= clamp(p.y,-h,h);
	return length(p)-r;
}
float cylinder(vec3 p,float r,float h) {
	return max(abs(p.y/h),capsule(p,r,h));
}
float box(vec3 p,vec3 s) {
	p = abs(p)-s;
    return max(max(p.x,p.y),p.z);
}
float rbox(vec3 p,vec3 s) {
	p = abs(p)-s;
    return length(p-min(p,0.0));
}
float quad(vec3 p,vec2 s) {
	p = abs(p) - vec3(s.x,0.0,s.y);
    return max(max(p.x,p.y),p.z);
}

vec2 opU( vec2 d1, vec2 d2 )
{
	return (d1.x<d2.x) ? d1 : d2;
}

// boolean operations
float boolUnion(float a,float b) { return min(a,b); }
float boolIntersect(float a,float b) { return max(a,b); }
float boolSub(float a,float b) { return max(a,-b); }

// smooth operations. thanks to iq
float boolSmoothIntersect(float a, float b, float k ) {
    float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
    return mix(a,b,h) + k*h*(1.0-h);
}
float boolSmoothSub(float a, float b, float k ) {
    return boolSmoothIntersect(a,-b,k);
}

const mat2 m2 = mat2( 0.80, -0.60, 0.60, 0.80 );
const mat3 m3 = mat3( 0.00,  0.80,  0.60,
                     -0.80,  0.36, -0.48,
                     -0.60, -0.48,  0.64 );

float water_noise(vec3 p) {
    float f = 0.0;
    f += 0.5000*noise_3( p ); p = m3*p*2.02;
    f += 0.2500*noise_3( p ); p = m3*p*2.03;
    f += 0.1250*noise_3( p ); p = m3*p*2.01;
    f += 0.0625*noise_3( p );
    return f/0.9375;
}



float water_surface( vec2 pos ) {
	vec2 posm = 0.02*pos * m2;
	posm.x += 0.001*iGlobalTime;
	float f = water_noise( vec3( posm*1.9, iGlobalTime*0.01 ));
	float height = 0.5+0.1*f;
	height += 0.05*sin( posm.x*6.0 + 10.0*f );
	return  height;
}

#define SLICES 6


float rock(vec3 p) {   
    
   const float rad = 2.5*1.2;
   float d = rbox(p,vec3(25.5, 0.1 + distToCam*1.0, 250.5)); 
    for(int i = 0; i < SLICES; i++) {
        float sph = sphere(p, rad);
//        float sph = rbox(p,vec3(12.5));
//        float sph = capsule(p, 2.5*1.2, 6.0);//sphere(p, 2.5*1.2);
        float v = min(d,sph);
        float col = max(sph-d,0.0)*0.0001;
       // constCol += vec3(col);
     	d -= v*0.355;
    }
    vec3 modray = vec3(cos(p.y), -iGlobalTime*0.025+0.25*sin(p.x), 0.25*cos(p.z));
    float c = sphere(opRep(p + modray, vec3(0.4,0.4,0.4)),0.0001)*3.0;
    if (c<d) {
        raydir = normalize(raydir+distToCam*vec3(0.0, 0.0, 0.1));//0.01*modray;//vec3(0.1, 0.0, 0.0);
        constCol += vec3(0.03,0.095,0.03);
    }

    return d;//min(c,d);
}

float water_height = -0.0;

float water(vec3 p) {
    //return plane(p,vec4(0.0,1.0,0.0,1.0));
    return plane(p-vec3(0.,water_height,0.),vec4(0.0,1.0,0.0,0.0)) 
        - water_noise(p)*0.1;
   
}

float sea_floor(vec3 p) {
    return plane(p-vec3(0.,-10.0,0.),vec4(0.0,1.0,0.0,0.0));
}


float map_corail(vec3 p) {
    float y = 0.1;
    p -= vec3(0.0,y,0.0);
    return rock(p) + fbm3(p*4.0,0.4,2.96) * DISPLACEMENT;
}

float map_corail_high(vec3 p) {
    float y = 0.1;
    p -= vec3(0.0,y,0.0);
    return rock(p) + fbm3_high(p*4.0,0.4,2.96) * DISPLACEMENT;
}


vec2 map(vec3 p) {
    float ice = map_corail(p);
    float w = water(p);
   	return opU(vec2(ice, 0.5), vec2(w, 1.0));
    //return vec2(ice, 0.5);
}


vec2 map_detailed(vec3 p) {
   	float ice = map_corail_high(p);
    return vec2(ice, 0.5);
}

// tracing
vec3 getNormal(vec3 p, float dens) {
    vec3 n;
    n.x = map_detailed(vec3(p.x+EPSILON,p.y,p.z)).x;
    n.y = map_detailed(vec3(p.x,p.y+EPSILON,p.z)).x;
    n.z = map_detailed(vec3(p.x,p.y,p.z+EPSILON)).x;
    return normalize(n-map_detailed(p).x);
}


vec2 getOcclusion(vec3 p, vec3 n) {
    vec2 r = vec2(0.0);
    for(int i = 0; i < AO_SAMPLES; i++) {
        float f = float(i)*INV_AO_SAMPLES;
        float hao = 0.01+f*AO_PARAM.x;
        float hc = 0.01+f*CORNER_PARAM.x;
        float dao = map(p + n * hao).x - TRESHOLD;
        float dc = map(p - n * hc).x - TRESHOLD;
        r.x += clamp(hao-dao,0.0,1.0) * (1.0-f);
        r.y += clamp(hc+dc,0.0,1.0) * (1.0-f);
    }    
    r.x = pow(clamp(1.0-r.x*INV_AO_SAMPLES*AO_PARAM.y,0.0,1.0),0.5);
    r.y = clamp(r.y*INV_AO_SAMPLES*CORNER_PARAM.y,0.0,1.0);
    return r;
}

struct AO_Settings {
 int samples;
 float inv_samples;
 vec2 param;
 vec2 corner;
 float treshold;
};


const AO_Settings AO_HARD = AO_Settings(
    3,
    1.0/3.0,
    vec2(1.2, 3.8),
    vec2(0.25, 10.0),
    0.3
);

vec2 getOcclusion2(vec3 p, vec3 n) {
    vec2 r = vec2(0.0);
    for(int i = 0; i < AO_HARD.samples; i++) {
        float f = float(i)*AO_HARD.inv_samples;
        float hao = 0.01+f*AO_HARD.param.x;
        float hc = 0.01+f*AO_HARD.corner.x;
        float dao = map(p + n * hao).x - AO_HARD.treshold;
        float dc = map(p - n * hc).x - AO_HARD.treshold;
        r.x += clamp(hao-dao,0.0,1.0) * (1.0-f);
        r.y += clamp(hc+dc,0.0,1.0) * (1.0-f);
    }    
    r.x = pow(clamp(1.0-r.x*AO_HARD.inv_samples*AO_HARD.param.y,0.0,1.0),0.5);
    r.y = clamp(r.y*AO_HARD.inv_samples*AO_HARD.corner.y,0.0,1.0);
    return r;
}



const int NUM_RAYMARCH_STEPS = 64;
vec3 spheretracing(vec3 ori, out vec3 p) {
    vec3 td = vec3(0.0);
    td.z += 1.0;
   iterCount = 0.0;
    for(int i = 0; i < NUM_RAYMARCH_STEPS; i++) {
       iterCount += 1.0;
        distToCam = td.z;
        p = ori + raydir * td.z;
        td.xy = map(p);
        if(td.x < TRESHOLD) break;
        td.z += (td.x-TRESHOLD) * 0.9;
    }
    return td;
}





vec3 computeColor(vec3 p, vec2 occ, vec3 l, vec3 n, vec3 e, float dist) {
	float transmissionRange = dist*0.2;
	float transmission1 = map( p + e*transmissionRange ).x/transmissionRange;
	vec3 sslight = vec3(1.,1.,1.) * smoothstep(0.0,1.0,transmission1);
    float ic = pow(1.0-occ.y,0.5);
    vec3 baseCol = (texture2D( uSampler0, p.zy*0.25).xyz)/(1.0+iterCount*0.052) + constCol*0.25;
    vec3 caustics = texture2D( uSampler2, n.zy*0.4+vec2(0.0,iGlobalTime*0.095)).xyz + texture2D( uSampler2, p.zy*0.4+vec2(0.0,iGlobalTime*0.095)).xyz;
    caustics *= 0.5;
    baseCol *= 0.3+2.0*caustics;
    vec3 color = baseCol + (sslight*0.25);      
    float f = pow(1.0 - max(dot(n,-e),0.0), 1.5) * .5 * ic;
    color = mix(color,vec3(1.0),f);    
    color += vec3(diffuse(n,l,0.5) * WHITE * 0.5);
    color += vec3(specular(n,l,e,8.0) * WHITE * 3.5 * ic );
    n = normalize(n - normalize(p) * 0.5);    
    color += vec3(specular(n,l,e,80.0) * WHITE * 3.5 * ic );    
    color -= vec3(0.3) * smoothstep(1.0,0.01, occ.x); 
    
    return color/max(1.0,dist*0.4);
}

vec3 lgt = vec3(0);
// main
void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    constCol = vec3(0.0,0.0,0.0);
	q = fragCoord.xy / iResolution.xy;
    vec2 uv = q  * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;    
    float time = iGlobalTime * 0.3;
        
    // ray
    vec3 ang = vec3(0.0,0.0,iGlobalTime*0.05);
	mat3 rot = fromEuler(ang);
    ori = vec3(0.0,3.75,iGlobalTime*0.2);//camPos;
    vec3 dir = normalize(vec3(uv.xy,-2.0));    
    dir = dir * rot;

    vec3 p;
    vec4 difr = texture2D( uSampler1, p.xy);
    raydir = reflect(dir,difr.rgb);
    vec3 td = spheretracing(ori,p);
    
      
    vec3 light = normalize(vec3(-0.1,0.7,-1.0));
         
    // color
    vec3 color = vec3(1.0);   
    // ice
    vec3 n = getNormal(p,td.z);
    vec2 occ = getOcclusion(p,n);
    color = computeColor(p,occ,light,n,dir, td.z);
    //
             
    // post
    
    color = clamp(color, 0., 1.);
    color = color*0.5 + 0.5*color*color*(3.0-2.0*color);
    color = pow(color, vec3(0.416667))*1.055 - 0.055;
	color *= pow( 16.0*q.x*q.y*(1.0-q.x)*(1.0-q.y), 0.12 );
    
    fragColor = vec4(color*2.5, 1.0);
}