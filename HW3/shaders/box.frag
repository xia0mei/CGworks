#version 300 es
precision mediump float;

out vec4 FragColor;

uniform float ambientStrength, specularStrength, diffuseStrength, shininess;

in vec3 Normal;//法向量
in vec3 FragPos;//相机观察的片元位置
in vec2 TexCoord;//纹理坐标
in vec4 FragPosLightSpace;//光源观察的片元位置

uniform vec3 viewPos;//相机位置
uniform vec4 u_lightPosition; //光源位置	
uniform vec3 lightColor;//入射光颜色

uniform sampler2D diffuseTexture;
uniform sampler2D depthTexture;
uniform samplerCube cubeSampler;//盒子纹理采样器


float shadowCalculation(vec4 fragPosLightSpace, vec3 normal, vec3 lightDir)
{
    // 执行透视除法
    vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
    // 变换到[0,1]范围
    projCoords = projCoords * 0.5 + 0.5;
    
    // 检查当前片段是否在深度贴图的可见范围内
    if(projCoords.z > 1.0)
        return 0.0;
    
    // 从深度贴图中获取最近的深度值
    float closestDepth = texture(depthTexture, projCoords.xy).r;
    // 当前片段的深度
    float currentDepth = projCoords.z;
    
    // 计算阴影偏移（解决阴影痤疮问题）
    float bias = max(0.05 * (1.0 - dot(normal, lightDir)), 0.005);
    
    /*TODO3: 添加阴影计算，返回1表示是阴影，返回0表示非阴影*/
    // 使用PCF（百分比渐进过滤）来平滑阴影边缘
    float shadow = 0.0;
    vec2 texelSize = 1.0 / vec2(textureSize(depthTexture, 0));
    for(int x = -1; x <= 1; ++x)
    {
        for(int y = -1; y <= 1; ++y)
        {
            float pcfDepth = texture(depthTexture, projCoords.xy + vec2(x, y) * texelSize).r;
            shadow += (currentDepth - bias) > pcfDepth ? 1.0 : 0.0;
        }
    }
    shadow /= 9.0;
    
    return shadow;
}       

void main()
{
    //采样纹理颜色
    vec3 TextureColor = texture(diffuseTexture, TexCoord).xyz;

    //计算光照颜色
 	vec3 norm = normalize(Normal);
	vec3 lightDir;
	if(u_lightPosition.w == 1.0) 
        lightDir = normalize(u_lightPosition.xyz - FragPos);
	else 
        lightDir = normalize(-u_lightPosition.xyz); // 对于平行光，方向是固定的
    
	vec3 viewDir = normalize(viewPos - FragPos);
	vec3 reflectDir = reflect(-lightDir, norm);

    /*TODO2:根据phong shading方法计算ambient,diffuse,specular*/
    // 环境光
    vec3 ambient = ambientStrength * lightColor;
    
    // 漫反射
    float diff = max(dot(norm, lightDir), 0.0);
    vec3 diffuse = diffuseStrength * diff * lightColor;
    
    // 镜面反射
    float spec = pow(max(dot(viewDir, reflectDir), 0.0), shininess);
    vec3 specular = specularStrength * spec * lightColor;
  
  	vec3 lightReflectColor = (ambient + diffuse + specular);

    //判定是否阴影，并对各种颜色进行混合
    float shadow = shadowCalculation(FragPosLightSpace, norm, lightDir);
	
    // 环境光不受阴影影响，漫反射和镜面反射受阴影影响
    vec3 resultColor = (ambient + (1.0 - shadow) * (diffuse + specular)) * TextureColor;
    
    // 添加半透明效果
    FragColor = vec4(resultColor, 0.8); // alpha值为0.8实现半透明
}