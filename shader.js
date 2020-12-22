var Shader;

function startBG() {
    const canvas = document.getElementById('glBackground');
    const gl = canvas.getContext('webgl');

    if (!gl) {
        alert('There was an error getting WebGL here, fall back to a bg image.');
        return;
    }


    const vsSource = `
        attribute vec4 aVertexPosition;

        void main() {
            gl_Position = aVertexPosition;
        }
    `;

    // Perlin function taken from https://www.shadertoy.com/view/4sXSRN
    // Based on the tutorial from https://www.iquilezles.org/www/articles/warp/warp.htm
    // TODO: Should I use medium precision instead?
    const fsSource = `
        precision highp float;

        uniform vec2 u_Resolution;
        uniform float u_Time;
        uniform sampler2D u_NoiseTexture;

        float noise(vec2 uv){
            return texture2D(u_NoiseTexture, uv).r;
        }

        float perlin(vec2 uv){
            uv *= .02;
            float t = u_Time/2048.;
            float res = noise(uv     +t*vec2(.5,  .5))*64.
                      + noise(uv*2.  +t*vec2(-.7, .2))*32.
                      + noise(uv*4.  +t*vec2( 0,   1))*16.
                      + noise(uv*8.  +t*vec2(1,    0))*8.
                      + noise(uv*16. +t*vec2(-.5,-.5))*4.
                      + noise(uv*32. +t*vec2(.1,  .1))*2.
                      + noise(uv*64. +t*vec2(.9,  .9));
                        
            return res / 128.;
        }

        vec2 marbel(vec2 uv) {
            vec2 a = vec2( perlin(uv), perlin(uv+vec2(.14, 1.5)));
            vec2 b = vec2( perlin(uv + a + vec2( .3, 1.7)), 
                           perlin(uv + a + vec2(4.2, -.66)));
                        
            return vec2(perlin(uv + b + vec2(5.2, -7.3)), b.y);
        } 

        void main() {
            vec2 f = marbel(gl_FragCoord.xy / u_Resolution);
            vec3 col = vec3(1.);
            col = mix(col, vec3(.8, .3, .05), f.x*f.x);
            col = mix(col, vec3(.05, 0., 0.), f.y*1.4);
        
            gl_FragColor = vec4(col, 1.);
        }
    `;

    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const shader = {
        gl: gl,
        canvas: canvas,
        program: shaderProgram,
        attribLoc: {
            vertexPos: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        },
        uniformLoc: {
            noiseTex: gl.getUniformLocation(shaderProgram, 'u_NoiseTexture'),
            Time: gl.getUniformLocation(shaderProgram, 'u_Time'),
            Resolution: gl.getUniformLocation(shaderProgram, 'u_Resolution'),
        },
        buffers: {
            position: initBuffer(gl, [-1.0,1.0, 1.0,1.0, -1.0,-1.0, 1.0,-1.0]),
        },
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Bind the background plane
    gl.bindBuffer(gl.ARRAY_BUFFER, shader.buffers.position);
    gl.vertexAttribPointer(
        shader.attribLoc.vertexPos,
        2,
        gl.FLOAT,
        false,
        0,
        0,
    );

    gl.enableVertexAttribArray(
        shader.attribLoc.vertexPos
    );

    // Bind the noise texture
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, loadTexture(gl, 'Noise.png'));

    gl.useProgram(shader.program);

    gl.uniform1i(shader.uniformLoc.noiseTex, 0);
    gl.uniform1f(shader.uniformLoc.Time, 0.0);
    gl.uniform2fv(
        shader.uniformLoc.Resolution, 
        new Float32Array([canvas.width, canvas.height])
    );

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    Shader = shader;

    window.requestAnimationFrame(drawBG);
}

function drawBG(time) {
    Shader.gl.uniform1f(Shader.uniformLoc.Time, time / 1000.0);
    Shader.gl.drawArrays(Shader.gl.TRIANGLE_STRIP, 0, 4);

    window.requestAnimationFrame(drawBG);
}

function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    // build our shader
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    // check for shader error
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('error compiling program, see console for info');
        console.error('program compile error: ', gl.getProgramInfoLog(shaderProgram))
        return;
    }

    return shaderProgram;
}

function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // check for errors
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('error comiling shader, see console for info');
        console.error('shader compile error: ', gl.getShaderInfoLog(shader))
        gl.deleteShader(shader);
        return;
    } 

    return shader;
}

function initBuffer(gl, data) {
    const buffer = gl.createBuffer();

    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(gl.ARRAY_BUFFER,
                  new Float32Array(data),
                  gl.STATIC_DRAW);
    
    return buffer;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(
        gl.TEXTURE_2D,
        0, // layer
        gl.RGB,
        1, // width
        1, // height
        0, // border
        gl.RGB,
        gl.UNSIGNED_BYTE,
        new Uint8Array([255, 255, 255]), // 1 black pixel
    );

    const image = new Image();
    image.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D, 
            0, // layer
            gl.RGB,
            gl.RGB,
            gl.UNSIGNED_BYTE,
            image,
        );
        
        // assume this image will be a power of 2
        gl.generateMipmap(gl.TEXTURE_2D);
    };
    image.src = url;

    return texture;
}

window.onload = startBG();