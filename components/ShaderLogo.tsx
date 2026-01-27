"use client";

import { useEffect, useRef } from "react";

const vertexShaderSource = `
attribute vec2 a_position;
void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `
precision highp float;

uniform vec2 iResolution;
uniform float iTime;

const float PHI = 1.618033988749895;

mat3 transpose3(mat3 m) {
    return mat3(
        m[0][0], m[1][0], m[2][0],
        m[0][1], m[1][1], m[2][1],
        m[0][2], m[1][2], m[2][2]
    );
}

void intersect_plane(vec3 dir, vec3 pos, vec3 planenormal, float planeoffset,
                     inout float near, inout float far, inout vec3 nearnormal, inout vec3 farnormal)
{
    float negheight = planeoffset - dot(pos, planenormal);
    float slope = dot(dir, planenormal);
    float t = negheight / slope;

    if(slope < 0.0) {
        if(t > near) {
            near = t;
            nearnormal = planenormal;
        }
    } else {
        if(t < far) {
            far = t;
            farnormal = planenormal;
        }
    }
}

bool find_intersection(vec3 dir, vec3 pos, out float near, out float far, out vec3 nearnormal, out vec3 farnormal)
{
    near = -10000.0;
    far = 10000.0;
    nearnormal = vec3(0.0);
    farnormal = vec3(0.0);

    float r = 1.2;
    vec3 n = normalize(vec3(PHI, 1.0, 0.0));
    float offset = n.x * r;

    intersect_plane(dir, pos, normalize(vec3( PHI, 1.0, 0.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(-PHI, 1.0, 0.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3( PHI,-1.0, 0.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(-PHI,-1.0, 0.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;

    intersect_plane(dir, pos, normalize(vec3( 1.0, 0.0, PHI)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(-1.0, 0.0, PHI)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3( 1.0, 0.0,-PHI)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(-1.0, 0.0,-PHI)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;

    intersect_plane(dir, pos, normalize(vec3(0.0, PHI, 1.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(0.0,-PHI, 1.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(0.0, PHI,-1.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;
    intersect_plane(dir, pos, normalize(vec3(0.0,-PHI,-1.0)), offset, near, far, nearnormal, farnormal);
    if(far < 0.0 || near > far) return false;

    return true;
}

vec3 environment(vec3 dir)
{
    vec3 col = vec3(0.0);

    float gridX = sin(dir.x * 25.0) * 0.5 + 0.5;
    float gridY = sin(dir.y * 25.0) * 0.5 + 0.5;
    float grid = pow(gridX * gridY, 8.0);

    float stripes = pow(max(sin(dir.y * 15.0), 0.0), 4.0);

    float spot1 = pow(max(dot(dir, normalize(vec3( 1.0, 0.3, 0.2))), 0.0), 64.0);
    float spot2 = pow(max(dot(dir, normalize(vec3(-1.0, 0.2, 0.1))), 0.0), 64.0);
    float spot3 = pow(max(dot(dir, normalize(vec3( 0.0, 1.0, 0.2))), 0.0), 64.0);
    float spot4 = pow(max(dot(dir, normalize(vec3( 0.5,-0.8, 0.1))), 0.0), 64.0);

    col += vec3(1.0) * grid * 0.8;
    col += vec3(1.0) * stripes * 0.6;
    col += vec3(1.0, 0.95, 0.9) * spot1 * 2.0;
    col += vec3(0.9, 0.95, 1.0) * spot2 * 2.0;
    col += vec3(1.0, 1.0, 0.95) * spot3 * 2.5;
    col += vec3(0.95, 0.9, 1.0) * spot4 * 1.5;

    float l = (col.r + col.g + col.b) / 3.0;
    float l2 = pow(l, 3.0) * 3.0;
    return col / max(l, 0.001) * l2;
}

void split_light(vec3 incomingdir, vec3 normal, float eta,
                 out vec3 reflecteddir, out vec3 refracteddir, out float reflectedfraction)
{
    reflecteddir = incomingdir - 2.0 * dot(incomingdir, normal) * normal;
    refracteddir = vec3(0.0);

    float k = 1.0 - eta * eta * (1.0 - dot(normal, incomingdir) * dot(normal, incomingdir));
    if(k > 0.0) {
        refracteddir = eta * incomingdir - (eta * dot(normal, incomingdir) + sqrt(k)) * normal;
        float f = pow(1.0 - eta, 2.0) / pow(1.0 + eta, 2.0);
        reflectedfraction = f + (1.0 - f) * pow(1.0 + dot(incomingdir, normal), 5.0);
    } else {
        reflectedfraction = 1.0;
    }
}

vec3 gather_light(vec3 dir, vec3 pos, vec3 normal, float eta, mat3 invRot)
{
    vec3 reflecteddir, refracteddir;
    float reflectedfraction;

    split_light(dir, normal, 1.0 / eta, reflecteddir, refracteddir, reflectedfraction);

    vec3 light = environment(invRot * reflecteddir) * reflectedfraction;

    dir = refracteddir;
    float fraction = 1.0 - reflectedfraction;

    for(int i = 0; i < 16; i++) {
        float near, far;
        vec3 nearnormal, farnormal;
        bool hit = find_intersection(dir, pos, near, far, nearnormal, farnormal);
        if(!hit) break;

        pos = pos + dir * far;

        // Internal core glow - soft light from center
        float distToCenter = length(pos);
        float coreGlow = exp(-distToCenter * 1.5) * 0.4;
        light += vec3(0.9, 0.95, 1.0) * coreGlow * fraction;

        split_light(dir, -farnormal, eta, reflecteddir, refracteddir, reflectedfraction);

        if(reflectedfraction < 1.0) {
            light += environment(invRot * refracteddir) * (1.0 - reflectedfraction) * fraction;
        }

        dir = reflecteddir;
        fraction *= reflectedfraction;

        if(fraction < 0.01) break;
    }

    return light;
}

void main()
{
    vec2 position = (2.0 * gl_FragCoord.xy - iResolution.xy) / max(iResolution.x, iResolution.y);
    vec3 pos = vec3(0.0, 0.0, -4.5);
    vec3 dir = normalize(vec3(position, 1.0));

    float a = sin(iTime * 0.15);
    float b = iTime * 0.1;

    float cb = cos(b), sb = sin(b);
    float ca = cos(a), sa = sin(a);

    mat3 rotY = mat3(cb, 0.0, -sb,
                     0.0, 1.0, 0.0,
                     sb, 0.0, cb);

    mat3 rotX = mat3(1.0, 0.0, 0.0,
                     0.0, ca, sa,
                     0.0, -sa, ca);

    mat3 rot = rotY * rotX;
    mat3 invRot = transpose3(rot);

    vec3 localdir = rot * dir;
    vec3 localpos = rot * pos;

    float near, far;
    vec3 localnearnormal, localfarnormal;
    bool hit = find_intersection(localdir, localpos, near, far, localnearnormal, localfarnormal);

    if(hit) {
        vec3 newlocalpos = localpos + localdir * near;
        vec3 light = vec3(0.0);
        light += gather_light(localdir, newlocalpos, localnearnormal, 2.38, invRot) * vec3(1.0, 0.0, 0.0);
        light += gather_light(localdir, newlocalpos, localnearnormal, 2.42, invRot) * vec3(0.0, 1.0, 0.0);
        light += gather_light(localdir, newlocalpos, localnearnormal, 2.46, invRot) * vec3(0.0, 0.0, 1.0);
        gl_FragColor = vec4(light, 1.0);
    } else {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
    }
}
`;

interface ShaderLogoProps {
  size?: number;
  className?: string;
}

export function ShaderLogo({ size = 32, className = "" }: ShaderLogoProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const glRef = useRef<WebGLRenderingContext | null>(null);
  const programRef = useRef<WebGLProgram | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: true
    });
    if (!gl) {
      console.error("WebGL not supported");
      return;
    }

    glRef.current = gl;

    // Compile vertex shader
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    if (!vertexShader) return;
    gl.shaderSource(vertexShader, vertexShaderSource);
    gl.compileShader(vertexShader);

    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      console.error("Vertex shader error:", gl.getShaderInfoLog(vertexShader));
      return;
    }

    // Compile fragment shader
    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    if (!fragmentShader) return;
    gl.shaderSource(fragmentShader, fragmentShaderSource);
    gl.compileShader(fragmentShader);

    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      console.error("Fragment shader error:", gl.getShaderInfoLog(fragmentShader));
      return;
    }

    // Create program
    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error("Program link error:", gl.getProgramInfoLog(program));
      return;
    }

    programRef.current = program;
    gl.useProgram(program);

    // Set up geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const positionLocation = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, "iResolution");
    const timeLocation = gl.getUniformLocation(program, "iTime");

    // Enable transparency
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const startTime = performance.now();

    const render = () => {
      if (!glRef.current || !programRef.current) return;

      const time = (performance.now() - startTime) / 1000;

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(timeLocation, time);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationRef.current);
      if (gl && program) {
        gl.deleteProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
      }
      glRef.current = null;
      programRef.current = null;
    };
  }, []);

  const pixelRatio = typeof window !== "undefined" ? Math.max(window.devicePixelRatio, 4) : 4;

  return (
    <canvas
      ref={canvasRef}
      width={size * pixelRatio}
      height={size * pixelRatio}
      className={className}
      style={{ width: size, height: size }}
    />
  );
}
