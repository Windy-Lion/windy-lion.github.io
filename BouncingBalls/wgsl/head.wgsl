struct TouchElem {isActive:u32,x:u32,y:u32,padding:u32};
struct UniformElem {touches:array<TouchElem,10>,canvasWidth:u32,canvasHeight:u32,nBalls:u32,ballHeight:u32,ballWidth:u32};
struct BallElem {x:f32,y:f32,vx:f32,vy:f32,r:f32,g:f32,b:f32,rad:f32};

@group(0) @binding(0)
var<storage, read_write> ballBuffer: array<BallElem>;
@group(0) @binding(1)
var<uniform> uniforms: UniformElem;
@group(0) @binding(2)
var<uniform> delta: f32;
@group(0) @binding(3)
var<uniform> swapIndex: u32;

override workgroupSize = 64;

fn id2x(id:u32) -> u32 {return id%uniforms.ballWidth;}
fn id2y(id:u32) -> u32 {return id/uniforms.ballWidth;}
fn xy2id(x:u32,y:u32) -> u32 {return ((x+uniforms.ballWidth) % uniforms.ballWidth) + ((y+uniforms.ballHeight) % uniforms.ballHeight) * uniforms.ballWidth;}
fn getBallAtXy(x:u32,y:u32) -> BallElem {return ballBuffer[xy2id(x,y)];}
fn setBallAtXy(ball:BallElem,x:u32,y:u32){
  ballBuffer[xy2id(x,y)] = ball;
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
  while(i<10){
    if(distance(pos,vec2(f32(uniforms.touches[i].x),f32(uniforms.touches[i].y)))<10.0){return true;}
    i++;
  }
  return false;
}