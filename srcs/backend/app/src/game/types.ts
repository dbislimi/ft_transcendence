const speed: number = 1;

class Player {
  private ypos: number;

  constructor(fieldHeight: number) {
    this.ypos = fieldHeight / 2;
  }

  private moveUp() {
    this.ypos -= speed;
  }
  private moveDown() {
    this.ypos += speed;
  }
}

class Ball {
  private x: number;
  private y: number;
  private dx: number;
  private dy: number;

  constructor(fieldHeight: number, fieldWidth: number) {
    this.x = fieldWidth / 2;
    this.y = fieldHeight / 2;
    this.dx = Math.random() < 0.5 ? -100 : 100;
    this.dy = Math.random() * 120 - 60;
  }

  setdX(dx: number = -this.dx): void {
    this.dx = dx;
  }
  setdY(dy: number = -this.dy): void {
    this.dy = dy;
  }
  setXY(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }
  getXY(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
  getdXdY(): { dx: number; dy: number } {
    return { dx: this.dx, dy: this.dy };
  }
}

export default class Field {
  private readonly height: number;
  private readonly width: number;
  private players: Player[];
  private ball: Ball;

  constructor(height: number = 100, width: number = 200) {
    this.height = height;
    this.width = width;
    this.ball = new Ball(this.height, this.width);
    this.players = [new Player(this.height)];
  }
  getSize(): { height: number; width: number } {
    return { height: this.height, width: this.width };
  }
  getBallPos(): { x: number; y: number } {
    return this.ball.getXY();
  }
  updateBallPosition(dt: number): void {
    let { newX, newY } = {
      newX: this.ball.getXY().x + this.ball.getdXdY().dx * dt,
      newY: this.ball.getXY().y + this.ball.getdXdY().dy * dt,
    };
    if (newY >= this.height) {
      newY = 2 * this.height - newY;
      this.ball.setdY();
    } else if (newY < 0) {
      newY = -newY;
      this.ball.setdY();
    }
    if (newX >= this.width) {
      newX = 2 * this.width - newX;
      this.ball.setdX();
    } else if (newX < 0) {
      newX = -newX;
      this.ball.setdX();
    }
    this.ball.setXY(newX, newY);
  }
}
