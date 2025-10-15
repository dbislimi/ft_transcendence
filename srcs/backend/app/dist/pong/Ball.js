const MAX_BALL_SPEED = 200;
export default class Ball {
    ballRadius;
    x;
    y;
    speed;
    dx = 0;
    dy = 0;
    constructor(field, size = 4) {
        this.x = field.W / 2;
        this.y = field.H / 2;
        this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
        this.dy = Math.random() * 120 - 60;
        this.speed = Math.sqrt(this.dx * this.dx + this.dy * this.dy);
        this.ballRadius = field.H / 70;
    }
    reset(field) {
        this.x = field.W / 2;
        this.y = field.H / 2;
        this.dx = Math.random() - 0.5 < 0.5 ? -30 : 30;
        this.dy = Math.random() * 120 - 60;
        this.clampSpeed();
    }
    clampSpeed() {
        this.speed = Math.min(this.speed, MAX_BALL_SPEED);
        const angle = Math.atan2(this.dy, this.dx);
        this.dx = Math.cos(angle) * this.speed;
        this.dy = Math.sin(angle) * this.speed;
    }
    getXY() {
        return { x: this.x, y: this.y };
    }
    getNextXY(dt) {
        return {
            nextX: this.x + this.dx * dt,
            nextY: this.y + this.dy * dt,
        };
    }
    get radius() {
        return this.ballRadius;
    }
}
