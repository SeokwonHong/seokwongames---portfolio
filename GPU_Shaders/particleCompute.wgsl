struct Particle {
    position: vec2f,
    velocity: vec2f,
};

struct Frame {
    mouse: vec2f,
    deltaTime: f32,
    aspect: f32,
};

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> frame: Frame;

@compute @workgroup_size(64)
fn updateParticles(@builtin(global_invocation_id) id: vec3u) {
    if (id.x >= arrayLength(&particles)) {
        return;
    }

    var particle = particles[id.x];
    let away = particle.position - frame.mouse;
    let distanceToMouse = length(away * vec2f(frame.aspect, 1.0));
    let radius = 0.20;
    let strength = 2.5;

    if (distanceToMouse > 0.0001 && distanceToMouse < radius) {
        let falloff = 1.0 - distanceToMouse / radius;
        particle.velocity += away / distanceToMouse * strength * falloff * frame.deltaTime;
    }

    particle.velocity *= exp(-5.0 * frame.deltaTime);
    particle.position = clamp(
        particle.position + particle.velocity * frame.deltaTime,
        vec2f(-1.0),
        vec2f(1.0),
    );
    particles[id.x] = particle;
}