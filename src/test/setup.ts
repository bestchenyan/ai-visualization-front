import { vi } from 'vitest';

// Mock window.devicePixelRatio
Object.defineProperty(window, 'devicePixelRatio', {
  value: 1,
  writable: true,
});

// Mock requestAnimationFrame
globalThis.requestAnimationFrame = vi.fn((cb) => {
  return setTimeout(cb, 16);
});

globalThis.cancelAnimationFrame = vi.fn((id) => {
  clearTimeout(id);
});

// Mock ResizeObserver
globalThis.ResizeObserver = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  unobserve: vi.fn(),
}));

// Mock WebGL context with all required methods
const mockWebGLContext = {
  activeTexture: vi.fn(),
  ARRAY_BUFFER: 0x88_92,
  attachShader: vi.fn(),

  bindBuffer: vi.fn(),
  bindFramebuffer: vi.fn(),
  bindRenderbuffer: vi.fn(),
  bindTexture: vi.fn(),
  blendEquation: vi.fn(),
  blendFunc: vi.fn(),

  bufferData: vi.fn(),
  // Canvas 相关
  canvas: {
    addEventListener: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      height: 150,
      left: 0,
      top: 0,
      width: 300,
    })),
    height: 150,
    removeEventListener: vi.fn(),
    style: {},
    width: 300,
  },
  checkFramebufferStatus: vi.fn(() => 0x8c_d5), // FRAMEBUFFER_COMPLETE
  clear: vi.fn(),
  clearColor: vi.fn(),
  clearDepth: vi.fn(),
  clearStencil: vi.fn(),

  COLOR_BUFFER_BIT: 0x00_00_40_00,
  COMPILE_STATUS: 0x8b_81,
  compileShader: vi.fn(),
  // Buffer 相关
  createBuffer: vi.fn(() => ({})),

  // Framebuffer 相关
  createFramebuffer: vi.fn(() => ({})),
  // Program 相关
  createProgram: vi.fn(() => ({})),
  // Renderbuffer 相关
  createRenderbuffer: vi.fn(() => ({})),
  // Shader 相关
  createShader: vi.fn(() => ({})),

  // Texture 相关
  createTexture: vi.fn(() => ({})),
  cullFace: vi.fn(),
  deleteBuffer: vi.fn(),
  deleteFramebuffer: vi.fn(),
  deleteProgram: vi.fn(),
  deleteRenderbuffer: vi.fn(),
  deleteShader: vi.fn(),

  deleteTexture: vi.fn(),
  DEPTH_BUFFER_BIT: 0x00_00_01_00,
  depthFunc: vi.fn(),
  depthMask: vi.fn(),
  disable: vi.fn(),
  disableVertexAttribArray: vi.fn(),
  // 渲染相关
  drawArrays: vi.fn(),

  drawElements: vi.fn(),
  // 状态管理
  enable: vi.fn(),
  // Attribute 相关
  enableVertexAttribArray: vi.fn(),
  FRAGMENT_SHADER: 0x8b_30,
  framebufferRenderbuffer: vi.fn(),

  framebufferTexture2D: vi.fn(),
  frontFace: vi.fn(),
  generateMipmap: vi.fn(),
  getAttribLocation: vi.fn(() => 0),
  getExtension: vi.fn(() => null),

  // 基础方法
  getParameter: vi.fn((param) => {
    switch (param) {
      case 0x0d_33: {
        return 16_384;
      } // MAX_TEXTURE_SIZE
      case 0x1f_00: {
        return 'Mock WebGL';
      } // VENDOR
      case 0x1f_01: {
        return 'Mock Renderer';
      } // RENDERER
      case 0x1f_02: {
        return 'Mock Version';
      } // VERSION
      case 0x80_73: {
        return 16;
      } // MAX_TEXTURE_IMAGE_UNITS
      case 0x85_1c: {
        return 16;
      } // MAX_RENDERBUFFER_SIZE
      case 0x88_72: {
        return 16;
      } // MAX_VARYING_VECTORS
      case 0x8b_4c: {
        return 16;
      } // MAX_COMBINED_TEXTURE_IMAGE_UNITS
      case 0x8b_4d: {
        return 4;
      } // MAX_VERTEX_TEXTURE_IMAGE_UNITS
      case 0x8b_8b: {
        return 16;
      } // MAX_VERTEX_UNIFORM_VECTORS
      case 0x8b_8c: {
        return 16;
      } // MAX_FRAGMENT_UNIFORM_VECTORS
      case 0x8d_fb: {
        return 8;
      } // MAX_VERTEX_ATTRIBS
      default: {
        return 0;
      }
    }
  }),
  getProgramInfoLog: vi.fn(() => ''),
  getProgramParameter: vi.fn(() => true),
  getShaderInfoLog: vi.fn(() => ''),
  getShaderParameter: vi.fn(() => true),
  // 特殊方法
  getShaderPrecisionFormat: vi.fn(() => ({
    precision: 23,
    rangeMax: 127,
    rangeMin: 127,
  })),
  getSupportedExtensions: vi.fn(() => []),
  // Uniform 相关
  getUniformLocation: vi.fn(() => ({})),

  lineWidth: vi.fn(),
  LINK_STATUS: 0x8b_82,
  linkProgram: vi.fn(),
  polygonOffset: vi.fn(),
  renderbufferStorage: vi.fn(),
  scissor: vi.fn(),
  shaderSource: vi.fn(),
  STATIC_DRAW: 0x88_e4,
  texImage2D: vi.fn(),
  texParameteri: vi.fn(),

  TRIANGLES: 0x00_04,

  uniform1f: vi.fn(),

  uniform1i: vi.fn(),
  uniform2f: vi.fn(),
  uniform3f: vi.fn(),
  uniform4f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  useProgram: vi.fn(),
  // 常量
  VERTEX_SHADER: 0x8b_31,
  vertexAttribPointer: vi.fn(),
  viewport: vi.fn(),
};

Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockWebGLContext),
});

// Mock console methods to avoid noise in tests
globalThis.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
};
