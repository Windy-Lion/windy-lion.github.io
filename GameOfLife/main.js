
init = async () => {
  const width = 2000; const height = 2000;
  const headWGSL = `
struct GradientBufferElem {flags: u32,}; // flag 0: gradient buffer 0, flag 1: gradient buffer 1
struct TouchElem {isActive:u32,x:u32,y:u32,padding:u32}
struct UniformElem {touches:array<TouchElem,6>,flags:u32,}; // flag 0: active gradient offset
override width: u32 = 1;
override height: u32 = 1;
@group(0) @binding(0)
var<storage, read_write> gradientBuffer: array<GradientBufferElem>;
@group(0) @binding(1)
var<uniform> uniforms: UniformElem;
fn id2x(id:u32) -> u32 {return id%width;}
fn id2y(id:u32) -> u32 {return id/width;}
fn xy2id(x:u32,y:u32) -> u32 {return ((x+width) % width) + ((y+height) % height) * width;}
fn getDAtXy(x:u32,y:u32,i:u32) -> u32 {return extractBits(gradientBuffer[xy2id(x,y)].flags,i,1);}
fn setDAtId(d:bool,id:u32,i:u32){
  gradientBuffer[id].flags = insertBits(gradientBuffer[id].flags,u32(d),i,1);
  return;
}
fn permutex(x:f32) -> f32 {
  return ((34.0 * x + 10.0) * x)%289.0;
}
fn permutexy(x:f32,y:f32) -> f32 {
  return permutex(permutex(x+2786.0)+permutex(y+1325.0));
}
fn randxy(x:f32,y:f32) -> f32 {
  return permutexy(4584.0+permutexy(x,y),3824.0+permutexy(x,-y))/289.0;
}
fn isNearTouches(pos:vec2<f32>) -> bool {
  var i=0;
  while(i<6){
    if((uniforms.touches[i].isActive == 1u)&&(distance(pos,vec2(f32(uniforms.touches[i].x),f32(uniforms.touches[i].y)))<10.0)){return true;}
    i++;
  }
  return false;
}
  `
  const computeWGSL = headWGSL+`
fn countNeighborhood(x:u32,y:u32,i:u32)->u32{
  return getDAtXy(x-1,y-1,i) + getDAtXy(x-1,y  ,i) +
         getDAtXy(x-1,y+1,i) + getDAtXy(x  ,y-1,i) +
         getDAtXy(x  ,y+1,i) + getDAtXy(x+1,y-1,i) +
         getDAtXy(x+1,y  ,i) + getDAtXy(x+1,y+1,i);
}
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  let touch_x:f32=f32(width)/2.0+.3;let touch_y:f32=f32(height)/2.0+.8;let touch_r:f32=800.0;
  
  if (gid.x >= arrayLength(&gradientBuffer)) {return;}
  let gradientIndex:u32=extractBits(uniforms.flags,0,1); //gradient index: which of the two gradient buffer flags is for reading
  let x:u32=id2x(gid.x); let y:u32=id2y(gid.x);
  let pos:vec2<f32>=vec2<f32>(f32(x),f32(y));
  let ct: u32 = countNeighborhood(x,y,gradientIndex);
  let cellState: u32 = getDAtXy(x,y,gradientIndex);
  var shallLive: bool = true;
  if (cellState==1){
    if ((ct<2)||(ct>3)) {shallLive = false;}
  } else {
    if (ct!=3) {shallLive = false;}
  }
  
  if (
    //(abs(distance(pos,vec2<f32>(touch_x,touch_y))-touch_r)<5) ||
    isNearTouches(pos)
  ){
    //shallLive=!shallLive;
    shallLive = (randxy(f32(x),f32(y))>.5);
  }
  setDAtId(shallLive,gid.x,1-gradientIndex);
}
  `
  const vertexWGSL = headWGSL+`
struct VSOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>,
};
@vertex
fn main(@builtin(vertex_index) vid : u32) -> VSOutput {
  var pos = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -3.0),
    vec2<f32>( 3.0,  1.0),
    vec2<f32>(-1.0,  1.0)
  );
  
  var out : VSOutput;
  out.position = vec4<f32>(pos[vid], 0.0, 1.0);
  
  // Map NDC [-1,1] → pixel coords
  out.fragCoord = (pos[vid] * 0.5 + vec2<f32>(0.5)) *
    vec2<f32>(f32(width), f32(height));
  return out;
}
  `
  const fragmentWGSL = headWGSL + `
struct VSOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>,
};
@fragment
fn main(in : VSOutput) -> @location(0) vec4<f32> {
  let gradientIndex:u32=extractBits(uniforms.flags,0,1);
  let cellState: u32 = getDAtXy(u32(in.fragCoord.x),u32(in.fragCoord.y),gradientIndex);
  
  // var color = vec3<f32>(in.fragCoord.x/f32(width), in.fragCoord.y/f32(height), 0.0);
  var color = vec3<f32>(f32(cellState));
  // TODO: render math
  return vec4<f32>(color, 1.0);
}
  `
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
  canvas.style["image-rendering"] = "pixelated";
  document.body.appendChild(canvas);
  
  let touches=[];
  const updateTouch = (event) => {
    touches=[...Array(6)].map((_,i)=>{
      if(event?.touches[i]){
        let canvasRect = canvas.getBoundingClientRect()
        return {
          active:true,
          x:event.touches[i].clientX-canvasRect.left,
          y:canvasRect.bottom-event.touches[i].clientY
        }
      }else{
        return {active:false,x:0,y:0}
      }
    });
  }
  canvas.addEventListener("touchstart",updateTouch);
  canvas.addEventListener("touchmove",updateTouch);
  canvas.addEventListener("touchend",updateTouch);
  updateTouch();
  
  device.addEventListener('uncapturederror', event => console.error(event.error.message));
  
  const context = canvas.getContext("webgpu");
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode: "opaque"});
  
  const SIZE_F32 = 4;
  const SIZE_U32 = 4;
  
  const gradientBufferElemSize = SIZE_U32;
  const gradientBufferSize = gradientBufferElemSize * width * height;
  const gradientBuffer = device.createBuffer({size: gradientBufferSize,usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
  
  const uniformBufferSize = SIZE_U32 + 6 * (3 * SIZE_U32 + SIZE_U32);
  const uniformBuffer = device.createBuffer({size:uniformBufferSize,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  
  const bindGroupLayout = device.createBindGroupLayout({entries: [
    {binding: 0,visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,buffer: { type: "storage" }},
    {binding: 1,visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,buffer: { type: "uniform" }},
  ]});
  const bindGroup = device.createBindGroup({layout: bindGroupLayout,entries: [
    {binding:0,resource:{buffer:gradientBuffer}},
    {binding:1,resource:{buffer:uniformBuffer}},
  ]});
  let offsetFlag=0;
  
  const computePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: device.createShaderModule({ code: computeWGSL }), entryPoint: "main", constants: {width,height} }
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module: device.createShaderModule({ code: vertexWGSL }), entryPoint: "main", constants: {width,height} },
    fragment: { module: device.createShaderModule({ code: fragmentWGSL }), entryPoint: "main", targets: [{ format }], constants: {width,height} },
    primitive: { topology: "triangle-list" }
  });
  
  function frame() {
    device.queue.writeBuffer(uniformBuffer,0,new Uint32Array([...touches.flatMap(touch=>[touch.active,touch.x,touch.y, 0]),offsetFlag]));
    const encoder = device.createCommandEncoder();
    // Compute pass
    {
      const pass = encoder.beginComputePass();
      pass.setPipeline(computePipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(Math.ceil(width*height/64));
      pass.end();
    }
    // Render pass
    {
      const view = context.getCurrentTexture().createView();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view, clearValue: { r: 0, g: 0, b: 0, a: 1 },
          loadOp: "clear", storeOp: "store"
        }]
      });
      pass.setPipeline(renderPipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3, 1, 0, 0); // fullscreen triangle
      pass.end();
      
    }
    device.queue.submit([encoder.finish()]);
    offsetFlag=1-offsetFlag;
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  
}

window.addEventListener("unhandledrejection", (err) => {
  try{console.error(err.reason.stack)}catch{}
  console.error(err);
});

init();