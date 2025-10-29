@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= arrayLength(&ballBuffer)) {return;}
  let ball=ballBuffer[gid.x];
  if(
    (((ball.x+ball.rad)>f32(uniforms.canvasWidth)) && (ball.vx > 0.0)) ||
    (((ball.x-ball.rad)<0.0) && (ball.vx < 0.0))
  ){ballBuffer[gid.x].vx*=-1.0;}
  if(
    (((ball.y+ball.rad)>f32(uniforms.canvasHeight)) && (ball.vy > 0.0)) ||
    (((ball.y-ball.rad)<0.0) && (ball.vy < 0.0))
  ){ballBuffer[gid.x].vy*=-1.0;}
}