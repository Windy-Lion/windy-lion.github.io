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
    vec2<f32>(f32(uniforms.canvasWidth), f32(uniforms.canvasHeight));
  return out;
}