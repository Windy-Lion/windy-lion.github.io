struct VSOutput {
  @builtin(position) position : vec4<f32>,
  @location(0) fragCoord : vec2<f32>,
};
@fragment
fn main(in : VSOutput) -> @location(0) vec4<f32> {

  var color = vec3<f32>(0.0,0.0,0.0);
  
  let x=i32(f32(in.fragCoord.x)*f32(uniforms.ballWidth)/f32(uniforms.canvasWidth));
  let y=i32(f32(in.fragCoord.y)*f32(uniforms.ballHeight)/f32(uniforms.canvasHeight));
  // return vec4<f32>(f32(x)/9.0,f32(y)/20.0,0.0,1.0);
  var i:i32=-10;
  while(i<=10){
    var j:i32=-10;
    while(j<=10){
      if(
        (((x+i)>=0) && ((x+i)<=i32(uniforms.ballWidth+1))) &&
        (((y+j)>=0) && ((y+i)<=i32(uniforms.ballHeight+1)))
      ){
        let id=xy2id(u32(x+i),u32(y+j));
        if(
          (id<arrayLength(&ballBuffer)) &&
          (distance(vec2<f32>(in.fragCoord.x,in.fragCoord.y),vec2<f32>(ballBuffer[id].x,ballBuffer[id].y))<ballBuffer[id].rad)
        ){
          color=vec3<f32>(ballBuffer[id].r,ballBuffer[id].g,ballBuffer[id].b);
          return vec4<f32>(color,1.0);
        }
      }
      j++;
    }
  i++;}
  return vec4<f32>(color,1.0);
  
  // let ballState: BallElem = getBallAtXy(u32(in.fragCoord.x/f32(uniforms.canvasWidth)*f32(uniforms.ballWidth)),u32(in.fragCoord.y/f32(uniforms.canvasHeight)*f32(uniforms.ballHeight)));
  
  // var color = vec3<f32>(in.fragCoord.x/f32(width), in.fragCoord.y/f32(height), 0.0);
  //var color = vec3<f32>(
    //ballState.x/f32(uniforms.canvasWidth),
    //ballState.y/f32(uniforms.canvasHeight),
    //0.0,
    //0.0
  //);
  // return vec4<f32>(color, 1.0);
}