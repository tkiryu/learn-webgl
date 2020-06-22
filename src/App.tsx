import { h, Fragment } from 'preact';

import { WebGLCanvas } from './webgl/WebGLCanvas';
import { WebGLCanvas2 } from './webgl/WebGLCanvas2';

export function App() {
  return (
    <Fragment>
      <h1>Learn WebGL</h1>
      {/* <WebGLCanvas /> */}
      <WebGLCanvas2 />
    </Fragment>
  );
}
