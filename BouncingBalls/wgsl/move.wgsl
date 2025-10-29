@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if (gid.x >= arrayLength(&ballBuffer)) {return;}
  ballBuffer[gid.x].x = ballBuffer[gid.x].x+ballBuffer[gid.x].vx*delta/1000.0;
  ballBuffer[gid.x].y = ballBuffer[gid.x].y+ballBuffer[gid.x].vy*delta/1000.0;
  
}