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

/*
===========================================================================
                          OVERLOADABLE CONSTANTS
===========================================================================
*/

// PI multiplied by 2
#ifndef pi2
	#define pi2 6.283185307179586476925286766559
#endif

// Max raymarch iterations
#ifndef MAX_ITER
	#define MAX_ITER 140
#endif

// Raymarch epsilon : Minimum distance to collision under which we consider the object is hit 
// and ray-marching can be interrupted. Augment to optimize or use variable e.g: 0.0001 * (1.0+rmdata.curIterCount)
#ifndef COLLISION_EPSILON
	#define COLLISION_EPSILON 0.0001
#endif

// march: ray step length given scene distance. Default is h.d (distance to nearest primitive in scene).
// To accelerate frame-rate, the dist can be amplified in function of the iteration, e.g: h.d * (1.0+rmdata.curIterCount*0.1)
#ifndef MARCH
	#define MARCH h.d
#endif

// function that will compute the fragment's color: col_diffuse, col_specular, or any overload
#ifndef COLORIZE
	#define COLORIZE col_specular
#endif

#ifndef COLLISION_TEST
	#define COLLISION_TEST if (h.d < COLLISION_EPSILON) break;
#endif

// function that handles the scene
#ifndef SCENE
	#define SCENE sdSphere(_p, 0.5)
#endif

#ifndef COMPUTE_NORMAL
	#define COMPUTE_NORMAL normal
#endif

#ifndef START_FX_FRAME
	#define START_FX_FRAME
#endif

#ifndef MAINPROG
	#define MAINPROG mainNormal
#endif

#ifndef START_DIST
	#define START_DIST 0.0
#endif

#ifndef FAR_ALPHA
#define FAR_ALPHA h.color.a = 0.0;
#endif 


#ifndef FOG_FAR
#define FOG_FAR fogfar
#endif

#ifndef CAMERA_LENS_DISTORTION
	#define CAMERA_LENS_DISTORTION
#endif

#ifndef POST_COLOR
	#define POST_COLOR post_color
#endif


/*
===========================================================================
							RAYMARCHER CODE
===========================================================================
*/

vec4 post_color(vec4 _col) {
    return _col;
}

vec3 col_specular(Hit hit)
{
	vec3 n = COMPUTE_NORMAL(rmdata.p, rmdata.dist);
	float diffuse = diffuseIntensity*max(0.0, dot(n, lightPosNormalized));
	vec3 ref = normalize(reflect(rmdata.dir, n));
	float specular = specularIntensity*pow(max(0.0, dot(ref, lightPosNormalized)), specularFallOff);
	return (diffuse * diffuseColor + specular * specularColor) / 3.0 * rmdata.fogFactor;
}


vec3 col_diffuse(Hit hit)
{
	vec3 n = COMPUTE_NORMAL(rmdata.p, rmdata.dist);
	float diffuse = diffuseIntensity*max(0.0, dot(n, lightPosNormalized));
	return (diffuse * diffuseColor) / 2.0 * rmdata.fogFactor;
}

#ifndef DISABLE_DEFAULT_RAYMARCHER

Hit scene(vec3 _p, float _d)
{
	int id = 0;	
	float d = 100000.0;
	vec4 col = vec4(1.0);

	d = SCENE;
	//col.a = clamp(1.0-(d/far), 0.0, 1.0);
	return Hit(d, col, id, _p);
}


vec4 mainNormal( ) 
{
        vec4 ret;
        vec2 pos = (gl_FragCoord.xy*2.0 - iResolution.xy) / iResolution.y;

	    rmdata.frag = vec2(gl_FragCoord.xy/iResolution.xy);
	
        #ifdef USE_MASKING
	        vec4 mskCol = texture2D(uSampler0, rmdata.frag);
	        if (mskCol.a > 0.999) {
		        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
	    } else 
        #endif // USE_MASKING        
        {
    

		MAIN_START
	
		START_FX_FRAME
		
        CAMERA_LENS_DISTORTION

		rmdata.p += rmdata.dir * START_DIST;
		rmdata.dist = START_DIST;
		for (int i = 0; i < MAX_ITER; i++)
		{
			h = scene(rmdata.p, rmdata.dist);

			COLLISION_TEST

			rmdata.dist += MARCH;
			rmdata.p += rmdata.dir * MARCH;

			#ifndef SKIP_FARTEST
				if (rmdata.dist > far)
				{
					rmdata.dist = far;
					FAR_ALPHA
					break;
				}
			#endif
			//h.color.a = 0.5;//max(0.0, 1.0 - rmdata.dist / 1.0);
			rmdata.curIterCount += 1.0;
		}
		
		rmdata.fogFactor = max(0.0, 1.0 - rmdata.dist / FOG_FAR);
		col = COLORIZE(h);
		ret = vec4(col, h.color.a);
	}
    return ret;
}

void main( void ) {
	rmdata.camera = camPos;
	vec4 col = MAINPROG();
    gl_FragColor = POST_COLOR(col);    
}

#endif // DISABLE_DEFAULT_RAYMARCHER
