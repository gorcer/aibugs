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
        const { initTourN, actions } = req.body;
        const bug = world.bugs.get(unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        try {
            actionService.addAction(bug, initTourN, actions);
            res.json({ status: 'plan_accepted', queueLength: bug.actionQueue.length });
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

    deleteUnit(req, res) {
        const { unitUid } = req.params;
        const bug = world.bugs.get(unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        world.grid[bug.x][bug.y] = null;
        world.bugs.delete(unitUid);
        res.json({ status: 'deleted', uid: unitUid });
    }

    getAllUnits(req, res) {
        const units = Array.from(world.bugs.values()).map(bug => ({
            uid: bug.uid,
            name: bug.name,
            x: bug.x,
            y: bug.y,
            angle: bug.angle,
            age: bug.age,
            is_live: bug.is_live,
            current_health: 100 * (bug.current_health / bug.max_health),
            current_energy: 100 * (bug.current_energy / bug.max_energy)
        }));
        const food = world.food.map(f => ({
            x: f.x,
            y: f.y,
            amount: f.amount,
            type: f.type
        }));
        res.json({ units, food });
    }
}

module.exports = new GameController();
