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
function Corail(params) {
    var t = this;
    t.params = params;
    t.hlp = new RaymarchFXHelper();
    t.hlp.construct({
        name: "Corail",
        parent: t,
        prevFramesCount: 2,
        fragmentShadersPasses: [
           {
               id: "onepass",
               customVS: "engine/oceanvs.vs",
               customFS: ["engine/shaderToyHeader.fs", "fx/Corail.fs", "engine/shaderToyFooter.fs"],
               inputs: null,
               disableRaymarch : true,
               outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                   width: window.innerWidth,
                   height: window.innerHeight,
               }
           },
            {
                id: "horizBlur",
                disableRaymarch: true,
                shader: "engine/HorizBlurVignette.fs",
                inputs: [{ id: "onepass", sampler: 1 }],
                outputTex: { // for fields description, check createRenderTexture in engine/Texture.js
                    width: window.innerWidth,
                    height: window.innerHeight
                }
            },
            {
                id: "vertBlur",
                disableRaymarch: true,
                shader: "engine/VertBlurVignette.fs",
                inputs: [{ id: "horizBlur", sampler: 1 }],
                outputTex: null
            }
        ]
    });
    t.interpParams = [];
    t.textures = [];
    t.textureParams = [];
    t.allParams = {};
    t.DOF = 2.9;
    t.textSent = false;
    t.endStarted = false;
    // Camera
    t.prevCam = [0.0, 0.0, 0.0];
}

Corail.prototype = {

    loadTextures: function (_reload) {
        var t = this;
        engine.pushContext(webgl_2d_raymarch, "Corail preloadResources");
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
        engine.text2d.closeAllIn(0.5);
    },

    enter: function () {
        var t = this;
        t.hlp.enter();

        t.timeAtStart = engine.time;

//        t.text5 = { x: 0.01, y: 0.95, string: "Thanks for watching", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 3.0, duration: 8.0, xspd:0.017 }, fadeOut: { wait: 0.0, duration: 8.0, xspd: 0.017 } };
        t.text4 = { x: 0.6, y: 0.95, string: "Revision 2016", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 5.0, duration: 3.0 }, fadeOut: { wait: 4.0, duration: 5.0, yspd: 0.02 }};
        t.textb = { x: 0.01, y: 0.1, string: "Logo:", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 3.0, duration: 2.0, yspd: 0.02 }, fadeOut: { wait: 4.0, duration: 5.0, xspd: -0.02 }, next: t.text4 };
        t.text2b = { x: 0.01, y: 0.25, string: "Made", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 5.0, duration: 1.0 }, fadeOut: { wait: 3.0, duration: 5.0, xspd: 0.04 } };
        t.text = { x: 0.01, y: 0.1, string: "Code & Music:", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 10.0, duration: 2.0, yspd: 0.02 }, fadeOut: { wait: 4.0, duration: 5.0, xspd: -0.02 }, next: t.textb };
        t.text2 = { x: 0.01, y: 0.25, string: "Soundy", fillStyle: "#FFFFFF", alpha: 0.0, fadeIn: { wait: 13.5, duration: 1.0 }, fadeOut: { wait: 1.5, duration: 5.0, xspd: 0.04 }, next: t.text2b };
    },

    manualCamera: function () {
        var t = this;
        var suite = t.parent;
        suite.campos[0] = 0.0;
        suite.campos[1] = 0.0;
        suite.campos[2] = 5.0+2.0 * Math.sin(engine.time);
        suite.camYaw = 0.0;
        suite.camRoll = 0.0;
        suite.camPitch = 0.0;
        t.prevCam[0] = suite.campos[0];
        t.prevCam[1] = suite.campos[1];
        t.prevCam[2] = suite.campos[2];
    },

    executeRenderPass: function (_passName) {
        var t = this;
        if (!t.hlp.enter_tick(_passName))
            return;

        var time = engine.time - t.timeAtStart;

        var gl = engine.gl;
        var pass = t.hlp.getFragmentShaderPass(_passName);
        var prg = pass.program;

        engine.setTexture(t.textures[0], 0);
        engine.setTexture(t.textures[1], 1);
        engine.setTexture(t.textures[2], 2);


        t.hlp.exit_tick(_passName);
    },

    executePostProcessPass: function (_passName) {
        var t = this;
        if (!t.hlp.enter_tick(_passName))
            return;

        var prg = t.hlp.getFragmentShaderPass(_passName).program;


        t.hlp.exit_tick(_passName);
    },


    tick: function (time, _gl, remaining) {
        var t = this;
        var time = engine.time - t.timeAtStart;

        if (engine.time >= 3.0 * 60.0 + 22.0 && !t.endStarted) {
            t.endStarted = true;
            engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.0, done: false, fillStyle: "#000000", alpha: 0.0, fadeIn: { wait: 0.0, duration: 5.0 }});
        }
        if (t.endStarted) {
            if (engine.time >= 3.0 * 60.0 + 27.0) { // need to fade music volune down from 3:15 to 3:30 in the mp3
                RECORD_VIDEO = false;
                engine.music.pause();
                if (engine.time >= 3.0 * 60.0 + 45.0) {
                    document.getElementById('canvas_div').style.display = 'none';
                    document.getElementById('start').style.display = 'block';
                    document.getElementById('start').style.cursor = 'default';
                    document.getElementById('start').setAttribute('style', 'z-index: 3; position:absolute; left:0px; top:0px;');
                    location.reload(false);
                }
                return;
            }
        }
        if (time > 2.0 && t.textSent == false) {
            t.textSent = true;
            engine.addCanvasClient(engine.frontCanvas, "Corail.enter");
            //    engine.text2d.addRectangle({ x: 0.0, y: 0.0, w: 1.0, h: 1.0, a: 0.6, alpha: 0.6, done: false, fillStyle: "#FFFFFF", fadeOut: 0.7 });
            engine.text2d.addEntry(t.text);
            engine.text2d.addEntry(t.text2);
            //   engine.text2d.closeAllIn(5.0);
        }

        t.executeRenderPass("onepass");
        t.executePostProcessPass("horizBlur");
        t.executePostProcessPass("vertBlur");
        return true;
    },


    createFX: function () {
        var t = this;
        t.hlp.createFX();
    }
}
