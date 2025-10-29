//override swapIndex:u32 = 0;
@compute @workgroup_size(64)
fn main(@builtin(global_invocation_id) gid : vec3<u32>) {
  if(gid.x>=uniforms.nBalls){return;}
  let ballX:u32 = id2x(gid.x);let ballY:u32 = id2y(gid.x);
  switch swapIndex{
    case 0:{
      let ballCompId:u32 = xy2id(ballX+1,ballY);
      if(
        ((ballX%2)==0) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        (ballBuffer[gid.x].x>ballBuffer[ballCompId].x)
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 1:{
      let ballCompId:u32 = xy2id(ballX+1,ballY);
      if(
        ((ballX%2)==1) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        (ballBuffer[gid.x].x>ballBuffer[ballCompId].x)
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 2:{
      let ballCompId:u32 = xy2id(ballX,ballY+1);
      if(
        ((ballY%2)==0) &&
        (ballY<(uniforms.ballHeight-1)) &&
        (ballCompId < uniforms.nBalls) &&
        (ballBuffer[gid.x].y>ballBuffer[ballCompId].y)
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 3:{
      let ballCompId:u32 = xy2id(ballX,ballY+1);
      if(
        ((ballY%2)==1) &&
        (ballY<(uniforms.ballHeight-1)) &&
        (ballCompId < uniforms.nBalls) &&
        (ballBuffer[gid.x].y>ballBuffer[ballCompId].y)
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 4:{
      let ballCompId:u32 = xy2id(ballX+1,ballY-1);
      if(
        ((ballX%2)==0) &&
        (ballY>0) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        ((ballBuffer[gid.x].x-ballBuffer[gid.x].y)>(ballBuffer[ballCompId].x-ballBuffer[ballCompId].y))
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 5:{
      let ballCompId:u32 = xy2id(ballX+1,ballY-1);
      if(
        ((ballX%2)==1) &&
        (ballY>0) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        ((ballBuffer[gid.x].x-ballBuffer[gid.x].y)>(ballBuffer[ballCompId].x-ballBuffer[ballCompId].y))
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }case 6:{
      let ballCompId:u32 = xy2id(ballX+1,ballY+1);
      if(
        ((ballX%2)==0) &&
        (ballY<(uniforms.ballHeight-1)) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        ((ballBuffer[gid.x].x+ballBuffer[gid.x].y)>(ballBuffer[ballCompId].x+ballBuffer[ballCompId].y))
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }default:{
      let ballCompId:u32 = xy2id(ballX+1,ballY+1);
      if(
        ((ballX%2)==1) &&
        (ballY<(uniforms.ballHeight-1)) &&
        (ballX<(uniforms.ballWidth-1)) &&
        (ballCompId < uniforms.nBalls) &&
        ((ballBuffer[gid.x].x+ballBuffer[gid.x].y)>(ballBuffer[ballCompId].x+ballBuffer[ballCompId].y))
      ){
        let a:BallElem = ballBuffer[gid.x];
        ballBuffer[gid.x]=ballBuffer[ballCompId];
        ballBuffer[ballCompId]=a;
      }
    }
  }
}