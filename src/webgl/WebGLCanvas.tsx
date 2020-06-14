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

export function WebGLCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas.getContext('webgl2');
    if (!gl) return;

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearDepth(1.0);
    // COLOR_BUFFER_BIT: canvas 内を指定された色でクリアするための定数
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const v_shader = createShader(gl, gl.VERTEX_SHADER, vertexShader);
    const f_shader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShader);
    const prg = createProgram(gl, v_shader, f_shader);

    const attLocation = gl.getAttribLocation(prg, 'position');
    const attStride = 3;
    const vertex_position = [0.0, 1.0, 0.0, 1.0, 0.0, 0.0, -1.0, 0.0, 0.0];
    const vbo = createVbo(gl, vertex_position);

    // VBOをバインド
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // attribute属性を有効にする
    gl.enableVertexAttribArray(attLocation);

    // attribute属性を登録
    gl.vertexAttribPointer(attLocation, attStride, gl.FLOAT, false, 0, 0);

    // モデル座標変換行列
    const mMatrix = Matrix4.identity();

    // ビュー座標変換行列
    const camera = new Vector3(0.0, 1.0, 3.0);
    const lookAt = new Vector3(0, 0, 0);
    const cameraUpDirection = new Vector3(0, 1, 0);
    const vMatrix = Matrix4.lookAt(camera, lookAt, cameraUpDirection);

    // プロジェクション座標変換行列
    const pMatrix = Matrix4.perspective({
      fovYRadian: 90,
      aspectRatio: 500 / 300,
      near: 0.1,
      far: 100
    });

    // 各行列を掛け合わせ座標変換行列を完成させる
    const mvpMatrix = pMatrix.mulByMatrix4(vMatrix).mulByMatrix4(mMatrix);

    // uniformLocationの取得
    const uniLocation = gl.getUniformLocation(prg, 'mvpMatrix');

    // uniformLocationへ座標変換行列を登録
    gl.uniformMatrix4fv(uniLocation, false, mvpMatrix.values);

    // モデルの描画
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // コンテキストの再描画
    gl.flush();
  });
  return <canvas ref={canvasRef} width="500" height="300" style={{ border: '1px solid #000' }} />;
}
