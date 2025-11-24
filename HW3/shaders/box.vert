#version 300 es
layout(location=0) in vec4 vPosition;
layout(location=1) in vec3 vNormal;
layout(location=2) in vec2 vTexCoord;

uniform mat4 u_ModelMatrix;
uniform mat4 u_ViewMatrix;
uniform mat4 u_ProjectionMatrix;
uniform mat4 u_LightSpaceMatrix;

out vec3 Normal;
out vec3 FragPos;
out vec2 TexCoord;
out vec4 FragPosLightSpace;

void main()
{
    gl_Position = u_ProjectionMatrix * u_ViewMatrix * u_ModelMatrix * vPosition;
    FragPos = vec3(u_ModelMatrix * vPosition);
    Normal = mat3(transpose(inverse(u_ModelMatrix))) * vNormal;
    TexCoord = vTexCoord;
    FragPosLightSpace = u_LightSpaceMatrix * vec4(FragPos, 1.0);
}