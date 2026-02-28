
class Food {
    constructor(uid, x, y, amount, type = 1) {
        this.id = 'f'+uid;
        this.x = x;
        this.y = y;
        this.amount = amount;
        this.type = type; // 1 - Обычная, 2 - мертвый жук
    }
}

module.exports = Food;
