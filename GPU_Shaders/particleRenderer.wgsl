struct Particle {
    position: vec2<f32>,
    velocity: vec2<f32>, //shader need to know 
};

@group(0) @binding(0) //group is like folder, and binbding is numbered slot insdie that folder
var<storage, read> particles: array<Particle>;

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) corner: vec2f,
};


//drawing the actual particles
@group(0) @binding(1)
var<uniform> particleSize: vec2f;



@vertex
fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) particleIndex: u32,
) -> VertexOutput {
    let corners = array(
        vec2f(-1.0, -1.0), vec2f(1.0, -1.0),
        vec2f(-1.0,  1.0), vec2f(1.0,  1.0),
    );
    let corner = corners[vertexIndex];
    let position = particles[particleIndex].position + corner * particleSize;
    return VertexOutput(vec4f(position, 0.0, 1.0), corner);
}

@fragment
fn fragmentMain(@location(0) corner: vec2f) -> @location(0) vec4f {
    if (dot(corner, corner) > 1.0) {
        discard;
    }
    return vec4f(0.0, 0.0, 0.0, 1.0);
}

//colouring
