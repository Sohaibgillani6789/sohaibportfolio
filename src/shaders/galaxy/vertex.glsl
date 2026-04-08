uniform float uTime;
uniform float uSize;

attribute vec3 aRandomness;
attribute float aScale;

varying vec3 vColor;

void main()
{
    /**
     * Position
     */
    vec4 localPosition = vec4(position, 1.0);

    // Animate particles in local space (around the tube's X-axis)
    float angle = uTime * 0.2; // Adjust speed here
    mat2 rotation = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
    localPosition.yz = rotation * localPosition.yz;

    vec4 modelPosition = modelMatrix * localPosition;

    // Randomness
    modelPosition.xyz += aRandomness;

    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;

    /**
     * Size
     */
    gl_PointSize = uSize * aScale;
    gl_PointSize *= (1.0 / - viewPosition.z);

    /**
     * Color
     */
    vColor = color;
}