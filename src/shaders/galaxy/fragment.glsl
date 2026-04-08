varying vec3 vColor;

void main()
{
    // Light point (Original glowing effect)
    // float strength = distance(gl_PointCoord, vec2(0.5));
    // strength = 1.0 - strength;
    // strength = pow(strength, 10.0);

    // **Option 1: Diffuse-like point (softer edges, less glow)**
    float strength = distance(gl_PointCoord, vec2(0.5));
    strength = 1.0 - strength;
    strength = pow(strength, 2.0); // Power 2.0 for a softer, less aggressive falloff.

    // **Option 2: Solid Disc (Sharp edges, no glow - uncomment this block if you want a perfect disc)**
    // float strength = distance(gl_PointCoord, vec2(0.5));
    // strength = step(0.5, strength);
    // strength = 1.0 - strength;

    // Final color
    vec3 color = mix(vec3(0.0), vColor, strength);
    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
}