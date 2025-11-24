var canvas;
var gl;
var program;

var vBuffer, cBuffer;//顶点属性数组

// 交互可调参数及根据参数生成的三个变换：M,V,P（全局变量）
var modelScale; //物体整体缩放的因子
var theta; // 视点（眼睛）绕Y轴旋转角度，参极坐标θ值，
var phi; // 视点（眼睛）绕X轴旋转角度，参极坐标φ值，
var isOrth; // 投影方式设置参数
var fov; // 透视投影的俯仰角，fov越大视野范围越大
var ModelMatrix; // 模型变换矩阵
var ViewMatrix; // 视图变换矩阵
var ProjectionMatrix; // 投影变换矩阵

// 新增变量：物体位置和鼠标控制
var objectPosition = vec3(0.0, 0.0, 0.0); // 物体位置
var objectRotation = vec3(0.0, 0.0, 0.0); // 物体旋转
var isMouseDown = false;
var lastMouseX, lastMouseY;

// shader里的统一变量在本代码里的标识变量
var u_ModelMatrix, u_ViewMatrix, u_ProjectionMatrix;
var u_Flag;//用来区分绘制坐标还是物体，坐标轴不需要进行M变换

/* ***********窗口加载时调用:程序环境初始化程序****************** */
window.onload = function() {
    canvas = document.getElementById("canvas");
    gl = canvas.getContext('webgl2');
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    program = initShaders( gl, "shaders/3d-wandering.vert", "shaders/3d-wandering.frag" );
    gl.useProgram( program );
    
	//调整画布大小为正方形以保证图形长宽比例正确,设置视口viewport大小与画布一致
    resize();
	
	// 开启深度缓存，以正确渲染物体被遮挡部分，3D显示必备
    gl.enable(gl.DEPTH_TEST); 
	// 设置canvas画布背景色 -白色-
    gl.clearColor(1.0, 1.0, 1.0, 1.0); 
	
	
    // 初始化数据缓冲区，并关联attribute 着色器变量
    vBuffer = gl.createBuffer();//为points存储的缓存
    cBuffer = gl.createBuffer();//为colors存储的缓存
		
	// 关联uniform着色器变量
    u_ModelMatrix = gl.getUniformLocation(program,"u_ModelMatrix");
    u_ViewMatrix = gl.getUniformLocation( program, "u_ViewMatrix" );
    u_ProjectionMatrix = gl.getUniformLocation( program, "u_ProjectionMatrix" );
    u_Flag = gl.getUniformLocation(program, "u_Flag");

	//初始化交互界面上的相关参数
	initViewingParameters();
	
    // 生成XYZ坐标轴，调用models-data.js中函数//返回points和colors数组 
    vertextsXYZ(); 	
	// 生成立方体模型数据，调用models-data.js中函数//返回points和colors数组 
    generateCube(); 
	
    // 发送顶点属性数据points和colors给GPU
    SendData(); 	
    // 调用绘制函数进行渲染
    render(); 
    
    // 注册鼠标事件
    setupMouseEvents();
}

/* 设置鼠标事件 */
function setupMouseEvents() {
    canvas.addEventListener('mousedown', function(e) {
        isMouseDown = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
    });
    
    canvas.addEventListener('mouseup', function(e) {
        isMouseDown = false;
    });
    
    canvas.addEventListener('mousemove', function(e) {
        if (!isMouseDown) return;
        
        var deltaX = e.clientX - lastMouseX;
        var deltaY = e.clientY - lastMouseY;
        
        // 鼠标拖动控制相机旋转
        theta += deltaX * 0.5;
        phi += deltaY * 0.5;
        
        // 限制phi角度范围，避免万向节锁
        phi = Math.max(1, Math.min(179, phi));
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        
        render();
    });
}

/* 注册键盘按键事件，修改变换矩阵中的各项参数，并重新进行渲染render */
window.onkeydown = function(e){
    var moveSpeed = 0.1;
    
    switch (e.keyCode) { 
		case 90:    // Z-物体整体放大
            modelScale *= 1.1;
            break;
        case 67:    // C-物体整体缩小
            modelScale *= 0.9;
            break;

        case 87:    // W-物体向前移动或相机绕X轴旋转
            if (e.shiftKey) {
                // WASD控制物体运动
                objectPosition[2] -= moveSpeed;
            } else {
                // 相机绕X轴旋转
                phi -= 5;
            }
            break;
        case 83:    // S-物体向后移动或相机绕X轴旋转
            if (e.shiftKey) {
                objectPosition[2] += moveSpeed;
            } else {
                phi += 5;
            }
            break;
        case 65:    // A-物体向左移动或相机绕Y轴旋转
            if (e.shiftKey) {
                objectPosition[0] -= moveSpeed;
            } else {
                theta -= 5;
            }
            break;
        case 68:    // D-物体向右移动或相机绕Y轴旋转
            if (e.shiftKey) {
                objectPosition[0] += moveSpeed;
            } else {
                theta += 5;
            }
            break;
                
        case 81:    // Q-物体向上移动
            if (e.shiftKey) {
                objectPosition[1] += moveSpeed;
            }
            break;
        case 69:    // E-物体向下移动
            if (e.shiftKey) {
                objectPosition[1] -= moveSpeed;
            }
            break;
                
        case 80:    // P-切换投影方式
            isOrth = !isOrth;
            break;
        case 77:    // M-放大俯仰角，给了一个限制范围
            fov = Math.min(fov + 5, 170);
            break;
        case 78:    // N-较小俯仰角
            fov = Math.max(fov - 5, 5);
            break; 			
			
		case 32:    // 空格-复位
            initViewingParameters();
            objectPosition = vec3(0.0, 0.0, 0.0);
            objectRotation = vec3(0.0, 0.0, 0.0);
            break;
    
        //===================TODO3：消隐设置=======================
        case 82: // R -开启后向面剔除
            gl.enable(gl.CULL_FACE);
            gl.cullFace(gl.BACK);
            break;
        case 84: // T- 关闭后向面剔除
            gl.disable(gl.CULL_FACE);
            break;

        case 66: // B-开启深度缓存，使用消隐算法
            gl.enable(gl.DEPTH_TEST);
            break;
        case 86: // V-关闭深度缓存，不用消隐
            gl.disable(gl.DEPTH_TEST);
            break;
    }        
    render();//参数变化后需要重新绘制画面
}

/* 绘图界面随窗口交互缩放而相应变化，保持1:1防止图形变形 */
window.onresize = resize;
function resize(){
    var size = Math.min(document.body.clientWidth, document.body.clientHeight);
    canvas.width = size;
    canvas.height = size;
    gl.viewport( 0, 0, canvas.width, canvas.height );
    render();
}


/* ****************************************
*  渲染函数render 
*******************************************/
function render(){    
    // 用背景色清屏
    gl.clear( gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT );
    
    // 构造观察流程中需要的三各变换矩阵
    ModelMatrix=formModelMatrix();//M:模型变换矩阵
    ViewMatrix=formViewMatrix(); //V:视点变换矩阵
    ProjectionMatrix=formProjectMatrix(); //投影变换矩阵
    
    // 传递变换矩阵    
    gl.uniformMatrix4fv( u_ModelMatrix, false, flatten(ModelMatrix) );     
    gl.uniformMatrix4fv( u_ViewMatrix, false, flatten(ViewMatrix) ); 
    gl.uniformMatrix4fv( u_ProjectionMatrix, false, flatten(ProjectionMatrix) ); 
	
    // 标志位设为0，用顶点数据绘制坐标系
    gl.uniform1i( u_Flag, 0 );
    gl.drawArrays( gl.LINES, 0, 6 ); // 绘制X轴，从0开始，读6个点
    gl.drawArrays( gl.LINES, 6, 6 ); // 绘制y轴，从6开始，读6个点
    gl.drawArrays( gl.LINES, 12, 6 ); // 绘制z轴，从12开始，读6个点        

    // 标志位设为1，用顶点数据绘制 面单色立方体
    gl.uniform1i( u_Flag, 1 );
    gl.drawArrays( gl.TRIANGLES, 18, points.length - 18 ); // 绘制物体,都是三角形网格表面
}


/* ****************************************************
* 初始化或复位：需要将交互参数及变换矩阵设置为初始值
********************************************************/
function initViewingParameters(){
	modelScale=1.0;		
    theta = 0;     
	phi = 90;	
    isOrth = true;     
	fov = 120;
	
	ModelMatrix = mat4(); //单位矩阵
    ViewMatrix = mat4();//单位矩阵
    ProjectionMatrix = mat4();//单位矩阵
};



/****************************************************************
* 初始及交互菜单选择不同图形后，需要重新发送顶点属性数据给GPU
******************************************************************/
function SendData(){
    var pointsData = flatten(points);
    var colorsData = flatten(colors);

    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, pointsData, gl.STATIC_DRAW );
    
    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );
    
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, colorsData, gl.STATIC_DRAW );
    
    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );
}

/********************************************************
* 交互菜单选择不同图形后，需要重新生成顶点数据并渲染
******************************************************/
function modelChange(model){
    points = [];
    colors = [];
    switch(model){
        case 'cube':{
            vertextsXYZ();
            generateCube();
            break;
        }
        case 'sphere':{
            vertextsXYZ();
            generateSphere();
            break;
        }
        case 'hat':{
            vertextsXYZ();
            generateHat();
            break;
        }
    }
    SendData();//重新发送数据
	render();//重新渲染
}


/* ****************************************************
 * 生成观察流水管线中的 M,V,P矩阵  
********************************************************/
function formModelMatrix(){
    // 物体缩放矩阵 - 使用 scale 而不是 scalem
    var scaleMatrix = scale(modelScale, modelScale, modelScale);
    
    // 物体平移矩阵
    var translateMatrix = translate(objectPosition[0], objectPosition[1], objectPosition[2]);
    
    // 组合变换：先缩放，再平移
    var modelMatrix = mult(translateMatrix, scaleMatrix);
    
    return modelMatrix;
}

function formViewMatrix(){
    var radius = 2.0; 
    const at = vec3(0.0, 0.0, 0.0);
	
    // 将角度转换为弧度
    var thetaRad = radians(theta);
    var phiRad = radians(phi);
    
    // 计算观察者位置（球坐标转直角坐标）
    var eye = vec3(
        radius * Math.sin(phiRad) * Math.sin(thetaRad),
        radius * Math.cos(phiRad),
        radius * Math.sin(phiRad) * Math.cos(thetaRad)
    );
    
    // 计算up向量，避免与视线方向共线
    var up = vec3(0.0, 1.0, 0.0);
    if (Math.abs(phi) < 10 || Math.abs(phi - 180) < 10) {
        up = vec3(0.0, 0.0, 1.0);
    }

    return lookAt(eye, at, up);
};

function formProjectMatrix(){
    const near = 0.1;
    const far = 100.0;
	const left = -1.5; 
    const right = 1.5;
    const bottom = -1.5;
    const ytop = 1.5;
	
	const aspect = 1.0; //纵横比设置为1
	
    if (isOrth) {
        // 正交投影
        return ortho(left, right, bottom, ytop, near, far);
    } else {
        // 透视投影
        return perspective(fov, aspect, near, far);
    }
}