const crypto = require('crypto');


class Bug {
    constructor(id, name, x, y, ownerId, angle = 0) {
        this.uid = 'b'+id;
        this.name = name;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.angle = angle; // 0, 90, 180, 270
        
        this.current_energy = 100;
        this.current_health = 100;
        this.faction = 1;
        this.max_speed = 1;
        this.rotate_speed = 90;
        this.max_energy = 100;
        this.energy_consumption_per_cell = 1;
        this.energy_consumption_per_degree = 0.1;
        this.energy_consumption_per_turn = 1;
        this.speed_multiply_on_low_energy = 0.5;
        this.max_health = 100;
        this.health_subtract_on_low_energy_per_turn = 1;
        this.health_increase_on_high_energy_per_turn = 1;
        this.energy_high_amount = 70; // %
        this.energy_low_amount = 10; // %
        this.attack = 1;
        this.defence = 0;
        this.feed_speed = 10;
        this.visible_range = 5; // дефолтное значение
        this.age = 0;
        this.memory_limit = 500;
        this.is_live = true;
        this.is_visible = true;
        this.weight = 100;
        this.weight_increase_on_high_energy_per_turn = 1;

        this.memory = []; // История ходов
        this.actionQueue = [];
        this.lastActionTurn = -1;
        this.brainSleeping = false;
        this.lastActivityTime = Date.now();
    }

    addMemory(record) {
        this.memory.push(record);
        if (this.memory.length > this.memory_limit) {
            this.memory.shift();
        }
    }
}

module.exports = Bug;
