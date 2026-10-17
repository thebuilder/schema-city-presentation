/*
 * The CRT pass from thebuilder.dk (lib/scene/crt.ts in thebuilder-dk), copied
 * as it is so the thank-you slide renders through the same tube as the site:
 * bloom, barrel, aberration, aperture grille, scanlines and the power-on line.
 */
import * as THREE from "three";

const QUAD_VERTEX = /* glsl */ `
  out vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const BRIGHT_FRAGMENT = /* glsl */ `
  uniform sampler2D uSource;
  uniform float uThreshold;
  uniform float uKnee;

  in vec2 vUv;
  layout(location = 0) out vec4 fragColor;

  void main() {
    vec3 color = texture(uSource, vUv).rgb;
    float brightness = max(color.r, max(color.g, color.b));
    float contribution = smoothstep(uThreshold, uThreshold + uKnee, brightness);
    fragColor = vec4(color * contribution, 1.0);
  }
`;

const BLUR_FRAGMENT = /* glsl */ `
  uniform sampler2D uSource;
  uniform vec2 uDirection;

  in vec2 vUv;
  layout(location = 0) out vec4 fragColor;

  void main() {
    vec3 sum = texture(uSource, vUv).rgb * 0.227027;
    vec2 offset1 = uDirection * 1.3846153846;
    vec2 offset2 = uDirection * 3.2307692308;
    sum += (texture(uSource, vUv + offset1).rgb + texture(uSource, vUv - offset1).rgb) * 0.3162162162;
    sum += (texture(uSource, vUv + offset2).rgb + texture(uSource, vUv - offset2).rgb) * 0.0702702703;
    fragColor = vec4(sum, 1.0);
  }
`;

const COMPOSITE_FRAGMENT = /* glsl */ `
  uniform sampler2D uScene;
  uniform sampler2D uBloom;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uPower;
  uniform float uCurvature;
  uniform float uAberration;
  uniform float uScanline;
  uniform float uGrille;
  uniform float uNoise;
  uniform float uSignal;
  uniform float uRoll;
  uniform float uBloomStrength;
  uniform vec3 uTint;

  in vec2 vUv;
  layout(location = 0) out vec4 fragColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }

  vec2 barrel(vec2 uv, float amount) {
    vec2 centred = uv * 2.0 - 1.0;
    centred *= 1.0 + amount * dot(centred.yx, centred.yx);
    return centred * 0.5 + 0.5;
  }

  vec3 filmic(vec3 x) {
    const float a = 2.51, b = 0.03, c = 2.43, d = 0.59, e = 0.14;
    return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
  }

  vec3 toSrgb(vec3 linear) {
    return mix(linear * 12.92, 1.055 * pow(max(linear, 1e-5), vec3(1.0 / 2.4)) - 0.055, step(0.0031308, linear));
  }

  void main() {
    vec2 uv = barrel(vUv, uCurvature);

    vec2 edge = smoothstep(vec2(0.0), vec2(0.004), uv) * smoothstep(vec2(0.0), vec2(0.004), 1.0 - uv);
    float inside = edge.x * edge.y;

    float loss = 1.0 - uSignal;
    vec2 pick = uv;

    float creep = loss * loss;

    float jump = (hash(vec2(floor(uTime * 1.8), 3.0)) - 0.5) * creep * 0.06;
    pick.y = fract(pick.y + uRoll + jump);

    float row = floor(pick.y * 52.0);
    float frame = floor(uTime * 12.0);
    float torn = step(0.68, hash(vec2(row * 1.7, frame + 5.0)));
    float tear = (hash(vec2(row, frame)) - 0.5) * torn;
    pick.x = fract(pick.x + tear * creep * 0.26);

    vec2 fromCentre = uv - 0.5;
    float spread = uAberration * (0.4 + dot(fromCentre, fromCentre) * 3.0) * 0.01;
    spread *= 1.0 + creep * 5.0;
    vec3 scene;
    scene.r = texture(uScene, pick + fromCentre * spread).r;
    scene.g = texture(uScene, pick).g;
    scene.b = texture(uScene, pick - fromCentre * spread).b;

    vec3 bloom = texture(uBloom, pick).rgb;
    vec3 color = scene + bloom * uBloomStrength;

    float column = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(
      column < 1.0 ? 1.0 : 0.38,
      column >= 1.0 && column < 2.0 ? 1.0 : 0.38,
      column >= 2.0 ? 1.0 : 0.38
    );
    color *= mix(vec3(1.0), mask, uGrille);

    float scan = 0.5 + 0.5 * sin(uv.y * uResolution.y * 3.14159265);
    color *= 1.0 - uScanline * scan;

    float bar = fract(uv.y + uTime * 0.11);
    color += color * smoothstep(0.96, 1.0, bar) * 0.28;

    color = filmic(color * 1.12);

    float grain = hash(gl_FragCoord.xy + fract(uTime) * 91.0) - 0.5;
    color += grain * uNoise;
    color *= 0.985 + 0.015 * sin(uTime * 37.0);

    float snow = hash(gl_FragCoord.xy + fract(uTime) * 141.0);
    float grey = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(color, vec3(grey), creep * 0.7);
    color = mix(color, vec3(snow * 0.46), smoothstep(0.8, 1.0, loss) * 0.94);

    float vignette = smoothstep(1.35, 0.42, length(fromCentre) * 2.0);
    color *= mix(0.55, 1.0, vignette);

    float lit = smoothstep(0.0, 0.05, uPower);
    float stretch = pow(smoothstep(0.02, 0.3, uPower), 1.7);
    float open = smoothstep(0.32, 0.8, uPower);

    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 trace = vec2((uv.x - 0.5) * aspect, uv.y - 0.5);
    float halfLength = mix(0.005, 0.52 * aspect, stretch);
    float halfThick = mix(0.005, 0.009, smoothstep(0.0, 0.1, uPower));
    float along = 1.0 - smoothstep(halfLength * 0.55, halfLength, abs(trace.x));
    float across = 1.0 - smoothstep(halfThick * 0.35, halfThick, abs(trace.y));

    float aperture = max(open, 0.0001);
    float slot = smoothstep(aperture, aperture * 0.35, abs(uv.y - 0.5) * 2.0);
    color *= slot * smoothstep(0.2, 0.6, uPower);
    color += uTint * along * across * (1.0 - open) * lit * 2.4;

    color *= inside;
    color += uTint * (1.0 - inside) * 0.02 * uPower;

    fragColor = vec4(toSrgb(color), 1.0);
  }
`;

class Pass {
  readonly material: THREE.ShaderMaterial;
  private readonly mesh: THREE.Mesh;
  private readonly scene = new THREE.Scene();
  private readonly geometry = new THREE.PlaneGeometry(2, 2);

  constructor(
    fragmentShader: string,
    uniforms: Record<string, THREE.IUniform>
  ) {
    this.material = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      fragmentShader,
      glslVersion: THREE.GLSL3,
      uniforms,
      vertexShader: QUAD_VERTEX,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  render(
    renderer: THREE.WebGLRenderer,
    target: THREE.WebGLRenderTarget | null,
    camera: THREE.Camera
  ): void {
    renderer.setRenderTarget(target);
    renderer.clear();
    renderer.render(this.scene, camera);
  }

  async prepare(
    renderer: THREE.WebGLRenderer,
    camera: THREE.Camera
  ): Promise<void> {
    await renderer.compileAsync(this.scene, camera);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}

const BLOOM = 0.85;

export interface CrtOptions {
  readonly bloom: boolean;
  readonly samples: number;
}

export class CrtPipeline {
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly sceneTarget: THREE.WebGLRenderTarget;
  private readonly bloomA: THREE.WebGLRenderTarget;
  private readonly bloomB: THREE.WebGLRenderTarget;
  private readonly bright: Pass;
  private readonly blur: Pass;
  private readonly composite: Pass;
  private readonly size = new THREE.Vector2(1, 1);
  private roll = 0;

  private readonly renderer: THREE.WebGLRenderer;

  private readonly options: CrtOptions;

  private readonly brightUniforms = {
    uKnee: { value: 0.45 },
    uSource: { value: null as THREE.Texture | null },
    uThreshold: { value: 0.62 },
  };

  private readonly blurUniforms = {
    uDirection: { value: new THREE.Vector2() },
    uSource: { value: null as THREE.Texture | null },
  };

  private readonly compositeUniforms = {
    uAberration: { value: 0.7 },
    uBloom: { value: null as THREE.Texture | null },
    uBloomStrength: { value: 0 },
    uCurvature: { value: 0.042 },
    uGrille: { value: 0.55 },
    uNoise: { value: 0.035 },
    uPower: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uRoll: { value: 0 },
    uScanline: { value: 0.16 },
    uScene: { value: null as THREE.Texture | null },
    uSignal: { value: 1 },
    uTime: { value: 0 },
    uTint: { value: new THREE.Color(0x86_fa_dd) },
  };

  constructor(renderer: THREE.WebGLRenderer, options: CrtOptions) {
    this.renderer = renderer;
    this.options = options;

    const targetOptions: THREE.RenderTargetOptions = {
      depthBuffer: true,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      stencilBuffer: false,
      type: THREE.HalfFloatType,
    };
    this.sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      samples: options.samples,
    });
    this.bloomA = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      depthBuffer: false,
    });
    this.bloomB = new THREE.WebGLRenderTarget(1, 1, {
      ...targetOptions,
      depthBuffer: false,
    });

    this.brightUniforms.uSource.value = this.sceneTarget.texture;
    this.blurUniforms.uSource.value = this.bloomA.texture;
    this.compositeUniforms.uBloom.value = this.bloomA.texture;
    this.compositeUniforms.uScene.value = this.sceneTarget.texture;
    this.compositeUniforms.uBloomStrength.value = options.bloom ? BLOOM : 0;

    this.bright = new Pass(BRIGHT_FRAGMENT, this.brightUniforms);
    this.blur = new Pass(BLUR_FRAGMENT, this.blurUniforms);
    this.composite = new Pass(COMPOSITE_FRAGMENT, this.compositeUniforms);
  }

  setSize(width: number, height: number, pixelRatio: number): void {
    const bufferWidth = Math.max(2, Math.round(width * pixelRatio));
    const bufferHeight = Math.max(2, Math.round(height * pixelRatio));
    this.size.set(bufferWidth, bufferHeight);
    this.sceneTarget.setSize(bufferWidth, bufferHeight);
    // Bloom runs at half resolution to bound the post-processing cost.
    const half = {
      height: Math.max(2, Math.floor(bufferHeight / 2)),
      width: Math.max(2, Math.floor(bufferWidth / 2)),
    };
    this.bloomA.setSize(half.width, half.height);
    this.bloomB.setSize(half.width, half.height);
    this.compositeUniforms.uResolution.value.set(bufferWidth, bufferHeight);
  }

  async prepare(scene: THREE.Scene, camera: THREE.Camera): Promise<void> {
    const previousTarget = this.renderer.getRenderTarget();
    try {
      this.renderer.initRenderTarget(this.sceneTarget);
      this.renderer.initRenderTarget(this.bloomA);
      this.renderer.initRenderTarget(this.bloomB);
      const compilations = await Promise.allSettled([
        this.renderer.compileAsync(scene, camera),
        this.bright.prepare(this.renderer, this.camera),
        this.blur.prepare(this.renderer, this.camera),
        this.composite.prepare(this.renderer, this.camera),
      ]);
      const failed = compilations.find(
        (result): result is PromiseRejectedResult =>
          result.status === "rejected"
      );
      if (failed) {
        throw failed.reason;
      }
      this.render(scene, camera, 0, 0);
    } finally {
      this.renderer.setRenderTarget(previousTarget);
    }
  }

  setPower(power: number): void {
    this.compositeUniforms.uPower.value = power;
  }

  setSignal(signal: number): void {
    this.compositeUniforms.uSignal.value = signal;
  }

  setGlow(lift: number): void {
    if (!this.options.bloom) {
      return;
    }
    this.compositeUniforms.uBloomStrength.value = BLOOM * (1 + lift);
  }

  render(
    scene: THREE.Scene,
    camera: THREE.Camera,
    elapsed: number,
    delta: number
  ): void {
    this.renderer.setRenderTarget(this.sceneTarget);
    this.renderer.clear();
    this.renderer.render(scene, camera);

    if (this.options.bloom) {
      this.brightUniforms.uSource.value = this.sceneTarget.texture;
      this.bright.render(this.renderer, this.bloomA, this.camera);

      const direction = this.blurUniforms.uDirection.value;
      const { width, height } = this.bloomA;

      this.blurUniforms.uSource.value = this.bloomA.texture;
      direction.set(1 / width, 0);
      this.blur.render(this.renderer, this.bloomB, this.camera);

      this.blurUniforms.uSource.value = this.bloomB.texture;
      direction.set(0, 1 / height);
      this.blur.render(this.renderer, this.bloomA, this.camera);
    }

    const loss = 1 - this.compositeUniforms.uSignal.value;
    const locked = loss <= 0.06;
    if (locked) {
      this.roll = this.roll > 0 ? Math.min(1, this.roll + delta * 1.6) % 1 : 0;
    } else {
      this.roll = (this.roll + delta * loss * loss * 0.6) % 1;
    }
    this.compositeUniforms.uRoll.value = this.roll;

    this.compositeUniforms.uTime.value = elapsed;
    this.composite.render(this.renderer, null, this.camera);
  }

  dispose(): void {
    this.sceneTarget.dispose();
    this.bloomA.dispose();
    this.bloomB.dispose();
    this.bright.dispose();
    this.blur.dispose();
    this.composite.dispose();
  }
}
