const world = require('../models/World');
const Bug = require('../models/Bug');
const actionService = require('../services/ActionService');
const dbService = require('../services/DbService');
const crypto = require('crypto');

class GameController {
    register = (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
        
        const apiKey = crypto.randomBytes(16).toString('hex');
        try {
            dbService.createUser(username, password, apiKey);
            res.json({ username, apiKey });
        } catch (e) {
            res.status(400).json({ error: 'Username already exists' });
        }
    }

    login = (req, res) => {
        const { username, password } = req.body;
        const user = dbService.getUserByUsername(username);
        
        if (!user || user.password !== password) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }
        
        res.json({ username: user.username, apiKey: user.api_key });
    }

    addUnit = (req, res) => {
        const { name, x, y, angle } = req.body;
        if (!world.isCellEmpty(x, y)) {
            return res.status(400).json({ error: 'Cell is occupied or out of bounds' });
        }


        const uid = world.bugs.size+1;
        const bug = new Bug(uid, name, x, y, req.user.id, angle);
        world.bugs.set(bug.uid, bug);
        world.grid[x][y] = bug;
        res.json({ uid: bug.uid });
    }

    watch = (req, res) => {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });
        
        const lastMemory = bug.memory[bug.memory.length - 1] || {};
        res.json({
            turnN: world.currentTurn,
            viewMap: lastMemory.viewMap || []
        });
    }

    action = (req, res) => {
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

    feel = (req, res) => {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        const lastMemory = bug.memory[bug.memory.length - 1] || {};
        res.json({
            turnN: world.currentTurn,
            feeling: lastMemory.feeling || []
        });
    }

    memory = (req, res) => {
        const bug = world.bugs.get(req.params.unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });
        res.json({ memory: bug.memory });
    }

    deleteUnit = (req, res) => {
        const { unitUid } = req.params;
        const bug = world.bugs.get(unitUid);
        if (!bug) return res.status(404).json({ error: 'Bug not found' });

        world.grid[bug.x][bug.y] = null;
        world.bugs.delete(unitUid);
        res.json({ status: 'deleted', uid: unitUid });
    }

    worldStat = (req, res) => {
        const totalBugs = world.bugs.size;
        let activityPercent = 0;
        
        if (totalBugs > 0) {
            const activeBugs = Array.from(world.bugs.values()).filter(bug => 
                bug.is_live && (bug.lastActionTurn === world.currentTurn || bug.actionQueue.length > 0)
            ).length;
            activityPercent = (activeBugs / totalBugs) * 100;
        }

        const units = Array.from(world.bugs.values()).map(bug => ({
            ownerId: bug.ownerId,
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

        res.json({ 
            units, 
            food,
            turnN: world.currentTurn,
            decisionTime: world.decisionTime,
            activityPercent: activityPercent
        });
    }
}

module.exports = new GameController();
