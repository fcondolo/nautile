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


/**
 * @constructor
 */
function  Ocean(params) {
    var t = this;
    t.params = params;
    t.hlp = new RaymarchFXHelper();
    t.hlp.construct({
        name: "Ocean",
        parent: t,
        prevFramesCount: 2,
        fragmentShadersPasses: [{
            id: "final",
            shader: "fx/Ocean.fs",
            inputs: null,
            outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                width: window.innerWidth,
                height: window.innerHeight
            }
        },
            {
                id: "horizBlur",
                disableRaymarch: true,
                shader: "engine/HorizBlurVignette.fs",
                inputs: [{ id: "final", sampler: 1 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "vertBlur",
                disableRaymarch: true,
                shader: "engine/VertBlurVignette.fs",
                inputs: [ { id: "horizBlur", sampler: 1 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "logo",
                disableRaymarch: true,
                shader: "fx/OceanLogo.fs",
                inputs: [{ id: "vertBlur", sampler: 1 }],
                outputTex: null
            }
        ]
    });
    t.interpParams = [];
    t.textures = [];
    t.textureParams = [];
    t.underLightPos = [];
    t.waterDrops = [];
    t.allParams = {};
    t.remaining = 100.0;
    t.DOF = 0.05;

    // Camera
    t.prevCam = [0.0, 0.0, 0.0];
    t.neon = 0.0;
    t.neon2 = 0.0;
    t.logoAlpha = 0.0;
    t.time = 0.0;
    t.ending = false;
}

Ocean.prototype = {
	
    loadTextures: function (_reload) {
        var t = this;
        engine.pushContext(webgl_2d_raymarch, "Ocean preloadResources");
        for (var i = 0; i < t.textureParams.length; i++)
            t.textures[i] = resman.prefetchTexture(t.textureParams[i].file);
        engine.popContext();
    },

    preloadResources: function () {
        var t = this;
        t.hlp.preloadResources();
        t.loadTextures(false);
    },

    exit: function () {
        var t = this;
        t.hlp.exit();
        for (var i = 0; i < t.textures.length; i++)
            t.textures[i].release();
        engine.text2d.closeAllIn(2.5);
      //  engine.text2d.clearAll();
    },

    enter: function () {
        var t = this;
        t.hlp.enter();
        t.exitRectDone = false;
   //     t.text2b = { x: 0.01, y: 0.17, string: "Nautile", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 6.0, duration: 0.01 }, fadeOut: { wait: 3.0, duration: 4.0, xspd: -0.05 }, max:0.5 };
        //t.text2 = { x: 0.01, y: 0.05, string: "Present", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 3.0, duration: 3.0, yspd: 0.05 }, fadeOut: { wait: 3.0, duration: 4.0, xspd: 0.025 }, max: 0.8 };
        t.text1 = { x: 0.01, y: 0.05, string: "Deadliners", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 8.0, duration: 3.0, yspd: 0.05 }, fadeOut: { wait: 3.0, duration: 5.0, xspd: 0.025 }, max: 0.8 };
        engine.addCanvasClient(engine.frontCanvas, "Ocean.enter");
        engine.text2d.addEntry(t.text1);
        engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#000000", alpha: 1.0, fadeOut: { wait: 0.0, duration: 2.0 } });

        engine.pushContext(webgl_2d_raymarch, "Ocean enter");
            var prg = t.hlp.getFragmentShaderPass("final").program;
            prg.underLightPos = engine.gl.getUniformLocation(prg, "underLightPos");
            prg.waterDrops = engine.gl.getUniformLocation(prg, "waterDrops");

            prg = t.hlp.getFragmentShaderPass("logo").program;
            prg.neon = engine.gl.getUniformLocation(prg, "neon");
            prg.neon2 = engine.gl.getUniformLocation(prg, "neon2");
            prg.logoAlpha = engine.gl.getUniformLocation(prg, "logoAlpha");

            prg = t.hlp.getFragmentShaderPass("horizBlur").program;
            prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");

            prg = t.hlp.getFragmentShaderPass("vertBlur").program;
            prg.sensitivity = engine.gl.getUniformLocation(prg, "sensitivity");


        engine.popContext();
        t.remaining = 100.0;
        t.time = 0.0;
    },

    manualCamera: function () {
        var t = this;
        var suite = t.parent;
        suite.campos[0] = 3.0 * Math.cos(t.hlp.elapsed * 0.3);
        var posY = Math.max(23.0,40.0 - t.hlp.elapsed);
        suite.campos[1] = posY;
        if (t.remaining < 10.0)
            suite.campos[1] += 1.0*(10.0 - t.remaining);
        suite.campos[2] = t.prevCam[2] + 0.4 * engine.deltaTime;
        suite.camYaw = 0.0;//-1.1 * Math.cos(t.hlp.elapsed * 0.1);
        suite.camRoll = 0.0;////-0.5*Math.cos(t.hlp.elapsed*0.1);
        suite.camPitch = 1.4;
        t.prevCam[0] = suite.campos[0];
        t.prevCam[1] = suite.campos[1];
        t.prevCam[2] = suite.campos[2];
    },

    executeRenderPass: function (_passName) {
        var t = this;
        if (!t.hlp.enter_tick(_passName))
            return;

        var gl = engine.gl;
        var pass = t.hlp.getFragmentShaderPass(_passName);
        var prg = pass.program;

        engine.setTexture(t.textures[0], 1); // noise
        engine.setTexture(t.textures[1], 0); // caustics
        engine.setTexture(t.textures[2], 5, true); // water drops

        if (prg.underLightPos) engine.gl.uniform4fv(prg.underLightPos, t.underLightPos);
        engine.gl.uniform3fv(prg.waterDrops, t.waterDrops);

        t.hlp.exit_tick(_passName);
    },

    executePostProcessPass: function (_passName) {
        var t = this;
        if (!t.hlp.enter_tick(_passName))
            return;

        var prg = t.hlp.getFragmentShaderPass(_passName).program;

        if (prg.lightPos)
            engine.gl.uniform2fv(prg.lightPos, [t.underLightPos[0], t.underLightPos[1]]);
        if (prg.decay)
            engine.gl.uniform1f(prg.decay, 0.96815);

        if (prg.sensitivity)
            engine.gl.uniform1f(prg.sensitivity, t.DOF);

        if (prg.neon) {
            t.neon += ((Math.random() * 0.5) - t.neon) * 0.25;
            if (t.remaining < 7.0)
                t.neon2 += ((Math.random()) - t.neon2) * 0.5;
            if (t.time > 24.0)
                t.logoAlpha = Math.min(1.0, (t.time - 22.0) * 0.1);
            if (t.remaining < 5.0)
                t.logoAlpha = Math.max(0.0, (t.remaining + 5.0) * 0.1);
        //    t.logoAlpha = 1.0;
            if (t.remaining < 2.0 && beatHandler.beatOccuredThisFrame) {
                t.ending = true;
            }
            if (t.ending) {
                t.neon = 4.0;
                t.neon2 = 4.0;
             //   t.logoAlpha = 0.0
            }
            engine.gl.uniform1f(prg.logoAlpha, t.logoAlpha);
            engine.gl.uniform1f(prg.neon, t.neon);
            engine.gl.uniform1f(prg.neon2, t.neon2);
        }

        engine.setTexture(t.textures[3], 2, true); // logo
        engine.setTexture(t.textures[4], 4, true); // flare

        t.hlp.exit_tick(_passName);
    },

    tick: function (time, _gl, remaining) {
        var t = this;
        t.DOF = 0.15*Math.abs(Math.sin(engine.time)) + 0.01;
        t.remaining = remaining;
        var deltaRemaining = 1.0;
        if (remaining < 10.0) {
            deltaRemaining = Math.max(1.0, 10.0 - remaining);
            if (remaining < 2.0 && !t.exitRectDone && beatHandler.beatOccuredThisFrame) {
                t.exitRectDone = true;
                engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 0.0, duration: 0.5 }, fadeOut: { wait: 0.0, duration: 1.0 } });
            }
        }


        t.underLightPos[0] = Math.cos(time * 0.9) * (2.5/deltaRemaining);
        t.underLightPos[1] = t.parent.campos[1]-2.0;//0.0;//Math.sin(time * 0.9) * 0.2;
        t.underLightPos[2] = remaining + Math.abs(Math.sin(time * 0.4) * 0.1);
        t.underLightPos[3] = Math.max(15.0,30.0-deltaRemaining);

        t.waterDrops[0] = Math.min(1.0,Math.max(0.0, 2.0*Math.sin(time*1.5)));
        t.waterDrops[1] = 2.0*Math.cos(time * 0.9) + 1.0;
        t.waterDrops[2] = 2.0 * Math.sin(time * 0.9) + 1.0;

        t.executeRenderPass("final");
        t.executePostProcessPass("horizBlur");
        t.executePostProcessPass("vertBlur");
        t.executePostProcessPass("logo");

        t.time += engine.deltaTime;


        return true;
    },


    createFX : function() {
        var t = this;
        t.hlp.createFX();
    }
}
