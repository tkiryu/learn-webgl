import { h, Fragment } from 'preact';

import { WebGLCanvas } from './webgl/WebGLCanvas';

export function App() {
  return (
    <Fragment>
      <h1>Learn WebGL</h1>
      <WebGLCanvas />
    </Fragment>
  );
}
