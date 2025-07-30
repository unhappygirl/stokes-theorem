vertexShader = `
            attribute vec3 position;
            attribute vec3 normal;

            uniform mat4 projectionMatrix;
            uniform mat4 viewMatrix;
            uniform vec3 lightDirection;
            uniform vec4 objectColor;    
            uniform bool lighting;

            varying vec4 v_color;
            varying vec3 pos;

            void main() {
                gl_PointSize = 4.0;  // hard‑coded px points
                vec4 lightColor = vec4(1.0, 1.0, 1.0, 1.0); 
                // Transform the normal to world space
                vec3 transformedNormal = mat3(viewMatrix) * normal;
                transformedNormal = normalize(transformedNormal);

                // Normalize the light direction
                vec3 normalizedLightDir = normalize(lightDirection);

                // Compute the diffuse lighting factor (Lambertian reflectance)
                float diffuseFactor = max(dot(transformedNormal, -normalizedLightDir), 0.0);

                // Compute the final color
                vec4 diffuseColor = diffuseFactor * lightColor;
                if (lighting) {
                    v_color = objectColor * diffuseFactor;
                } 
                else {
                    v_color = objectColor;
                }
                

                // Transform the vertex position
                gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
                pos = position;
            }
`;

fragmentShader = `
        precision mediump float;
        uniform bool useSolidColor;
        varying vec4 v_color;
        varying vec3 pos;

        void main() {
            vec3 normalizedPos = normalize(pos);
            vec3 interp = 0.5 + 0.5 * normalizedPos;
            vec4 finalColor = useSolidColor ? v_color : vec4(interp, 0.8);
            gl_FragColor = finalColor;
        }
`;
