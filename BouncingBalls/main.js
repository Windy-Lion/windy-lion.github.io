
init = async () => {
  const canvasWidth = 400; const canvasHeight = 700;
  const workgroupSize = 64; const nTouch = 10;
  const nBalls = 2000; const ballWidth = Math.floor(Math.sqrt(nBalls*canvasWidth/canvasHeight));const ballHeight = Math.ceil(nBalls/ballWidth);
  let swapIndex=0;const swapOrder=[0,1,2,3,4,5,6,7];const swapSteps=swapOrder.length;const swapStepsPerFrame=8;
  let neighborIndex=0;const neighborOrder=[0,1,2,3,4,5];const neighborSteps=neighborOrder.length;neighborStepsPerFrame=6;
  const vMax = 80;const vMin = 2;
  const radMax = 5;const radMin = 3;
  let delta = .1;
  
  let isGpuError = false;
  
  const begin = performance.now();
  
  const [headWGSL, swapWGSL_raw, bounceWGSL_raw, moveWGSL_raw, vertexWGSL_raw,fragmentWGSL_raw] = await Promise.all([
    fetch("./wgsl/head.wgsl").then(r => r.text()),
    fetch("./wgsl/swap.wgsl").then(r => r.text()),
    fetch("./wgsl/bounce.wgsl").then(r => r.text()),
    fetch("./wgsl/move.wgsl").then(r => r.text()),
    fetch("./wgsl/vertex.wgsl").then(r => r.text()),
    fetch("./wgsl/fragment.wgsl").then(r => r.text()),
  ]);
  
  const swapWGSL     = headWGSL + swapWGSL_raw;
  const bounceWGSL   = headWGSL + bounceWGSL_raw;
  const moveWGSL     = headWGSL + moveWGSL_raw;
  const vertexWGSL   = headWGSL + vertexWGSL_raw;
  const fragmentWGSL = headWGSL + fragmentWGSL_raw;
  
  //todo: support mouse events
  //todo: bounce and move physics
  
  const adapter = await navigator.gpu.requestAdapter();
  const device = await adapter.requestDevice();
  device.addEventListener('uncapturederror', event => {
    console.error(event.error.message);
    isGpuError=true;
  });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext("webgpu");
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  canvas.style.width = canvas.width + "px";
  canvas.style.height = canvas.height + "px";
  canvas.style["image-rendering"] = "pixelated";
  document.body.appendChild(canvas);
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({device,format,alphaMode: "opaque"});
  
  let touches=[];
  const updateTouch = (event) => {
    touches=[...Array(nTouch)].map((_,i)=>{
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
  function getFlatTouches(){return [...touches.flatMap(touch=>[touch.active,touch.x,touch.y, 0])];}
  canvas.addEventListener("touchstart",updateTouch);
  canvas.addEventListener("touchmove",updateTouch);
  canvas.addEventListener("touchend",updateTouch);
  updateTouch();
  
  const SIZE_F32 = 4;
  const SIZE_U32 = 4;
  
  const ballBufferElemSize = SIZE_F32 * 8; // x, y, vx, vy, r, g, b, rad
  const ballBufferSize = ballBufferElemSize * nBalls;
  const ballBuffer = device.createBuffer({size: ballBufferSize,usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST});
  
  const uniformBufferSize = (nTouch * (4 * SIZE_U32)) + 5 * SIZE_U32; // (nTouch * (isActive, x, y, padding)) + canvasWidth + canvasHeight + nBalls + ballHeight + ballWidth
  const uniformBuffer = device.createBuffer({size:uniformBufferSize,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  const getUniformArray = () => {return [...getFlatTouches(),canvasWidth,canvasHeight,nBalls,ballHeight,ballWidth];}
  
  const deltaBuffer = device.createBuffer({size: SIZE_F32,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
  
  const shaderParams = [
    [
      {name:"ballBuffer"   , getInit:initialBalls    , use:"storage, read_write", type:"array<BallElem>"},
      {name:"touches"      , getValue:getFlatTouches , use:"uniform" , type:"array<TouchElem,"+nTouch+">"},
      {name:"delta"        , value:.1                , use:"uniform" , type:"f32" },
      {name:"canvasWidth"  , value:canvasWidth       , use:"const"   , type:"u32" },
      {name:"canvasHeight" , value:canvasHeight      , use:"const"   , type:"u32" },
      {name:"nBalls"       , value:nBalls            , use:"const"   , type:"u32" },
      {name:"ballWidth"    , value:ballWidth         , use:"const"   , type:"u32" },
      {name:"ballHeight"   , value:ballHeight        , use:"const"   , type:"u32" },
    ],
    swapOrder.map(i=>
      [{name:"swapIndex",value:i,use:"uniform",type:"u32"}]
    ),
    neighborOrder.map(i=>
      [{name:"neighborOrder",value:i,use:"uniform",type:"u32"}]
    )
  ]
  console.log(shaderParams)
  
  
  const swapIndices = [...Array(swapSteps)].map((_,i)=>{
    const a = device.createBuffer({size:SIZE_U32,usage:GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST});
    device.queue.writeBuffer(a,0,new Uint32Array([swapOrder[i]]));
    return a;
  })
  
  const bindGroupLayout = device.createBindGroupLayout({entries: [
    {binding: 0,visibility: GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,buffer: { type: "storage" }},
    {binding: 1,visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,buffer: { type: "uniform" }},
    {binding: 2,visibility: GPUShaderStage.VERTEX | GPUShaderStage.COMPUTE | GPUShaderStage.FRAGMENT,buffer: { type: "uniform" }},
    {binding: 3,visibility: GPUShaderStage.COMPUTE,buffer: { type: "uniform" }},
  ]});
  const bindGroups = [...Array(swapSteps)].map((_,i)=>(
    device.createBindGroup({layout: bindGroupLayout,entries: [
      {binding:0,resource:{buffer:ballBuffer}},
      {binding:1,resource:{buffer:uniformBuffer}},
      {binding:2,resource:{buffer:deltaBuffer}},
      {binding:3,resource:{buffer:swapIndices[i]}},
    ]})
  ));
  
  const swapPipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: device.createShaderModule({ code: swapWGSL }), entryPoint: "main", constants: {workgroupSize} }
  });
  const bouncePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: device.createShaderModule({ code: bounceWGSL }), entryPoint: "main", constants: {workgroupSize} }
  });
  const movePipeline = device.createComputePipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    compute: { module: device.createShaderModule({ code: moveWGSL }), entryPoint: "main", constants: {workgroupSize} }
  });
  const renderPipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] }),
    vertex: { module: device.createShaderModule({ code: vertexWGSL }), entryPoint: "main", constants: {} },
    fragment: { module: device.createShaderModule({ code: fragmentWGSL }), entryPoint: "main", targets: [{ format }], constants: {} },
    primitive: { topology: "triangle-list" }
  });
  
  function initialBalls(){return [...Array(nBalls)].flatMap((_,i)=>{
    const v=Math.random()*(vMax-vMin)+vMin;const a=Math.random()*2*3.14159;
    return [Math.random()*canvasWidth,Math.random()*canvasHeight,v*Math.sin(a),v*Math.cos(a),.5,.5,.5,Math.random()*(radMax-radMin)+radMin];
  });}
  device.queue.writeBuffer(ballBuffer,0,new Float32Array(initialBalls()));
  function queueSwap(encoder){
    const pass = encoder.beginComputePass();
    pass.setPipeline(swapPipeline);
    pass.setBindGroup(0, bindGroups[swapIndex]);
    pass.dispatchWorkgroups(Math.ceil(nBalls/workgroupSize));
    pass.end();
    if(swapIndex<(swapSteps-1)){swapIndex++;}else{swapIndex=0}
  }
  let prevTimestamp=performance.now()
  function frame(timestamp) {
    if(isGpuError){return;}
    delta=timestamp-prevTimestamp;
    prevTimestamp=timestamp
    device.queue.writeBuffer(uniformBuffer,0,new Uint32Array(getUniformArray()));
    device.queue.writeBuffer(deltaBuffer,0,new Float32Array([delta]));
    
    const encoder = device.createCommandEncoder();
    [...Array(swapStepsPerFrame)].forEach(_=>queueSwap(encoder));
    // Move pass
    {
      const pass = encoder.beginComputePass();
      pass.setPipeline(movePipeline);
      pass.setBindGroup(0, bindGroups[0]);
      pass.dispatchWorkgroups(Math.ceil(nBalls/workgroupSize));
      pass.end();
    }
    // Bounce pass
    {
      const pass = encoder.beginComputePass();
      pass.setPipeline(bouncePipeline);
      pass.setBindGroup(0, bindGroups[0]);
      pass.dispatchWorkgroups(Math.ceil(nBalls/workgroupSize));
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
      pass.setBindGroup(0, bindGroups[0]);
      pass.draw(3, 1, 0, 0); // fullscreen triangle
      pass.end();
      
    }
    device.queue.submit([encoder.finish()]);
    requestAnimationFrame(frame);
  }
  console.log(performance.now()-begin);
  requestAnimationFrame(frame);
  
}

window.addEventListener("unhandledrejection", (err) => {
  try{console.error(err.reason.stack)}catch{}
  console.error(err);
});

init();