export default class Player {
    static playerWidth;
    boardHeight;
    size;
    x;
    y;
    speed = 90;
    movingUp = false;
    movingDown = false;
    bot = undefined;
    id;
    ActiveBonus = [];
    bonusCollectedTotal = 0;
    constructor(field, id) {
        this.boardHeight = field.H;
        this.size = field.H / 4;
        this.y = field.H / 2 - this.size / 2;
        Player.playerWidth = field.W / 100;
        this.id = id;
        if (id == 0)
            this.x = Player.playerWidth;
        else
            this.x = field.W - 2 * Player.playerWidth;
    }
    moveUp(state) {
        this.movingUp = state;
    }
    moveDown(state) {
        this.movingDown = state;
    }
    getData() {
        return { size: this.size, y: this.y };
    }
    reset() {
        this.ActiveBonus = this.ActiveBonus.filter((bonus) => {
            return false;
        });
        this.y = this.boardHeight / 2 - this.size / 2;
        this.moveDown(false);
        this.moveUp(false);
    }
    get width() {
        return Player.playerWidth;
    }
    get up() {
        return this.movingUp;
    }
    get down() {
        return this.movingDown;
    }
}
