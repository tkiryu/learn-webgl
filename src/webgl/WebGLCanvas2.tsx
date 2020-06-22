import { h } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

import { Matrix4, Vector3 } from 'matrixgl';

import vertexShader from '!!raw-loader!./vertex_shader.glsl';
import fragmentShader from '!!raw-loader!./fragment_shader.glsl';

function createShader(gl: WebGL2RenderingContext, type: GLenum, shaderSource: string): WebGLShader {
  const shader = gl.createShader(type);

  if (!shader) throw new Error('failed to create shader');

  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    throw new Error('failed to compile shader');
  }

  return shader;
}

function createProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();

  if (!program) throw new Error('failed to create program');

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);

  gl.linkProgram(program);

  // シェーダのリンクが正しく行なわれたかチェック
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    // 失敗していたらエラーログをアラートする
    console.error(gl.getProgramInfoLog(program));
    throw new Error('failed to link program');
  }

  // 成功していたらプログラムオブジェクトを有効にする
  gl.useProgram(program);

  // プログラムオブジェクトを返して終了
  return program;
}

function createVbo(gl: WebGL2RenderingContext, data: number[]): WebGLBuffer {
  // バッファオブジェクトの生成
  const vbo = gl.createBuffer();

  if (!vbo) throw new Error('failed to create buffer');

  // バッファをバインドする
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

  // バッファにデータをセット
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

  // バッファのバインドを無効化
  gl.bindBuffer(gl.ARRAY_BUFFER, null);

  // 生成した VBO を返して終了
  return vbo;
}

function setAttribute(gl: WebGL2RenderingContext, vbo: WebGLBuffer[], attL: number[], attS: number[]) {
  for (let i = 0, len = vbo.length; i < len; i++) {
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);
    gl.enableVertexAttribArray(attL[i]);
    gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
  }
}

export function WebGLCanvas2() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    const vShader = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    const fShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    const prg = createProgram(gl, vShader, fShader);

    const attLocation = new Array(2);
    // vertex_shader の in vec3 position;
    attLocation[0] = gl.getAttribLocation(prg, 'position');
    // vertex_shader の in vec4 color;
    attLocation[1] = gl.getAttribLocation(prg, 'color');

    const attStride = new Array(2);
    attStride[0] = 3;
    attStride[1] = 4;

    const vertexPosition = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];
    const vertexColor = [1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 1.0];
    const positionVbo = createVbo(gl, vertexPosition);
    const colorVbo = createVbo(gl, vertexColor);

    setAttribute(gl, [positionVbo, colorVbo], attLocation, attStride);

    // ビュー座標変換行列
    const camera = new Vector3(0.0, 0.0, 5.0);
    const lookAt = new Vector3(0, 0, 0);
    const cameraUpDirection = new Vector3(0, 1, 0);
    const vMatrix = Matrix4.lookAt(camera, lookAt, cameraUpDirection);

    // プロジェクション座標変換行列
    const pMatrix = Matrix4.perspective({
      fovYRadian: 45,
      aspectRatio: 500 / 300,
      near: 0.1,
      far: 100
    });

    let counter = 0;
    let requestId = 0;

    const tick = () => {
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.clearDepth(1.0);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      counter += 1;

      const rad = ((counter % 360) * Math.PI) / 180;

      const x = Math.cos(rad);
      const y = Math.sin(rad);

      const uniLocation = gl.getUniformLocation(prg, 'mvpMatrix');

      const mMatrix1 = Matrix4.translation(x, y + 1.0, 0.0);
      const mvpMatrix1 = pMatrix.mulByMatrix4(vMatrix).mulByMatrix4(mMatrix1);
      gl.uniformMatrix4fv(uniLocation, false, mvpMatrix1.values);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const mMatrix2 = Matrix4.translation(0.0, -1.0, 0.0).rotateY(rad);
      const mvpMatrix2 = pMatrix.mulByMatrix4(vMatrix).mulByMatrix4(mMatrix2);
      gl.uniformMatrix4fv(uniLocation, false, mvpMatrix2.values);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      const s = Math.sin(rad) + 1.0;
      const mMatrix3 = Matrix4.translation(-1.0, -1.0, 0.0).scale(s, s, 0);
      const mvpMatrix3 = pMatrix.mulByMatrix4(vMatrix).mulByMatrix4(mMatrix3);
      gl.uniformMatrix4fv(uniLocation, false, mvpMatrix3.values);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      requestId = requestAnimationFrame(tick);

      // コンテキストの再描画
      gl.flush();
    };
    tick();

    return () => {
      cancelAnimationFrame(requestId);
    };
  });
  return <canvas ref={canvasRef} width="500" height="300" style={{ border: '1px solid #000' }} />;
}
