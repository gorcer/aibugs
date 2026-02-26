class World {
    constructor() {
        this.width = 100;
        this.height = 100;
        this.decisionTime = 10; // секунды
        this.turnEndTime = Date.now() + (this.decisionTime * 1000);
        this.feedCount = 100;
        this.feedAmount = 1000000;
        this.subtractFeedPerTurn = 1;
        
        this.currentTurn = 0;
        this.bugs = new Map(); // uid -> Bug
        this.food = []; // Array of Food
        this.grid = []; // 2D array for fast lookup [x][y]
        
        this.initGrid();
    }

    initGrid() {
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = new Array(this.height).fill(null);
        }
    }

    isCellEmpty(x, y) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return false;
        return this.grid[x][y] === null;
    }
}

module.exports = new World();
