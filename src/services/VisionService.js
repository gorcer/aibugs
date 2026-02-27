const world = require('../models/World');

class VisionService {
    /**
     * Получает матрицу видимости для жука
     * @param {Bug} bug 
     * @returns {Array} Массив объектов {x, y, type}
     */
    getVisibleCells(bug) {
        const viewMap = [];
        const { x, y, angle, visible_range } = bug;

        // Направления: 0: вправо(x+), 90: вниз(y+), 180: влево(x-), 270: вверх(y-)
        // В задаче: 10,11 (шаг 1), 9,12 10,12 11,12 (шаг 2) и т.д.
        
        for (let step = 1; step <= visible_range; step++) {
            // На каждом шаге ширина области увеличивается, начиная с 3 клеток (side: -1, 0, 1)
            for (let side = -step; side <= step; side++) {
                let targetX = x;
                let targetY = y;

                if (angle === 0) { // Вправо
                    targetX += step;
                    targetY += side;
                } else if (angle === 90) { // Вниз
                    targetX += side;
                    targetY += step;
                } else if (angle === 180) { // Влево
                    targetX -= step;
                    targetY += side;
                } else if (angle === 270) { // Вверх
                    targetX += side;
                    targetY -= step;
                }

                if (targetX >= 0 && targetX < world.width && targetY >= 0 && targetY < world.height) {
                    const cellContent = world.grid[targetX][targetY];
                    let type = 0; // пусто
                    if (cellContent) {
                        type = cellContent.constructor.name === 'Bug' ? 2 : 1;
                    }
                    // Относительные координаты: y=1 - клетка прямо перед жуком
                    // x < 0 - слева, x > 0 - справа
                    if (type !== 0) {
                        viewMap.push({ x: side, y: step, type });
                    }
                }
            }
        }
        return viewMap;
    }
}

module.exports = new VisionService();
