const world = require('../models/World');
const Bug = require('../models/Bug');
const actionService = require('../services/ActionService');

class GameController {
    addUnit(req, res) {
        const { name, x, y, angle } = req.body;
        if (!world.isCellEmpty(x, y)) {
            return res.status(400).json({ error: 'Cell is occupied or out of bounds' });
        }
        const bug = new Bug(name, x, y, angle);
        world.bugs.set(bug.uid, bug);
        world.grid[x][y] = bug;
        res.json({ uid: bug.uid });
    }

    watch(req, res) {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });
        
        const lastMemory = bug.memory[bug.memory.length - 1] || {};
        res.json({
            turnN: world.currentTurn,
            viewMap: lastMemory.viewMap || []
        });
    }

    action(req, res) {
        const { unitUid } = req.params;
        const { initTourN, actionId, payload } = req.body;
        const bug = world.bugs.get(unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        try {
            actionService.addAction(bug, initTourN, actionId, payload);
            res.json({ status: 'queued' });
        } catch (error) {
            res.status(400).json({ error: error.message });
        }
    }

    feel(req, res) {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        const lastMemory = bug.memory[bug.memory.length - 1] || {};
        res.json({
            turnN: world.currentTurn,
            feeling: lastMemory.feeling || []
        });
    }

    memory(req, res) {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });
        res.json({ memory: bug.memory });
    }
}

module.exports = new GameController();
