struct Particle {
    position: vec2<f32>,
    velocity: vec2<f32>, //shader need to know 
};

@group(0) @binding(0) //group is like folder, and binbding is numbered slot insdie that folder
var<storage, read> particles: array<Particle>;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
};


//drawing the actual particles
@vertex
fn vertexMain(
    @builtin(vertex_index) vertexIndex: u32 //Each GPU worker receives a number.
) -> VertexOutput {
    var output: VertexOutput;

    let particle = particles[vertexIndex];

    output.position = vec4<f32>(
        particle.position.x,
        particle.position.y,
        0.0,
        1.0
    );

    return output;
}

//colouring
@fragment
fn fragmentMain() -> @location(0) vec4<f32> {
    return vec4<f32>(
        1.0,
        1.0,
        1.0,
        1.0
    );
}