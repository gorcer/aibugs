# AiBugs API Documentation

Base URL: `/api`

## Authorization
For all protected methods, you must pass the `x-api-key` header.

## Endpoints

### 0. User Registration
`POST /api/register`

**Request:**
```json
{
  "username": "player1",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "username": "player1",
  "apiKey": "generated-hex-string"
}
```

---

### 0.1 Authorization (Login)
`POST /api/login`

**Request:**
```json
{
  "username": "player1",
  "password": "securepassword"
}
```

**Response:**
```json
{
  "username": "player1",
  "apiKey": "generated-hex-string"
}
```

---

### 1. Add Unit (Bug)
`POST /api/addUnit`

Adds a new bug to the map at the specified coordinates.

**Request:**
```json
{
  "name": "BugName",
  "x": 10,
  "y": 10,
  "angle": 0
}
```
* `angle`: 0 (right), 90 (down), 180 (left), 270 (up).

**Response:**
```json
{
  "uid": "unit-uuid-string"
}
```

---

### 2. Bug Vision
`GET /api/watch/:unitUid`

Gets a matrix of what the bug sees at the moment (triangular area in front of it).

**Response:**
```json
{
  "turnN": 42,
  "viewMap": [
    {"x": 0, "y": 1, "type": 1, "id": "food-uuid"},
    {"x": -1, "y": 2, "type": 2, "id": "bug-uuid"}
  ]
}
```
* `type`: 0 — empty, 1 — food, 2 — another bug.
* `id`: unique object identifier.

---

### 3. Action Planning
`POST /api/action/:unitUid`

Sets an action plan for future turns. When a new list is received, the old plan is completely overwritten. The maximum number of actions in the list is limited by `memory_limit` (default 10).

**Request:**
```json
{
  "initTourN": 42,
  "actions": [
    { "actionId": 1, "payload": {} },
    { "actionId": 2, "payload": { "angle": 90 } },
    { "actionId": 3, "payload": {} }
  ]
}
```

**Constants `actionId`:**
* `0` (IDLE): Inaction.
* `1` (MOVE): Move forward 1 cell.
* `2` (ROTATE): Turn. In `payload`, you need to pass `{"angle": 90}` or `{"angle": -90}`.
* `3` (BITE): Bite the object in front of you (food or another bug).

**Response:**
```json
{
  "status": "queued"
}
```
*In case of a repeated action in the same turn, it will return a 400 error.*

---

### 4. Bug Feelings
`GET /api/feel/:unitUid`

Gets the current physical feelings of the bug.

**Response:**
```json
{
  "turnN": 42,
  "feeling": [
    {"energy": 100},
    {"health": 100},
    {"food_bites": 5},
    {"bug_bites": 2},
    {"pain": 90},
    {"currentPlan": [
      { "actionId": 1, "payload": {} },
      { "actionId": 2, "payload": { "angle": 90 } }
    ]}
  ]
}
```
* `pain`: angle (relative to the bug's direction) from which the pain came.
* `energy`/`health`: numerical values of current indicators.

---

### 5. Bug Memory
`GET /api/memory/:unitUid`

Returns the history of the last turns (limit — 10 entries).

**Response:**
```json
{
  "memory": [
    {
      "turnN": 41,
      "viewMap": [...],
      "feeling": [...],
      "lastAction": { "actionId": 1, "status": "OK" },
      "brainSleeping": true
    }
  ]
}
```
* `lastAction`: result of the action performed in this turn. `status` can be `OK` or `Fail`.
* `brainSleeping`: `true` if the bug is executing a plan and more than one action remains in the queue. Becomes `false` when the last action remains, the plan is empty, interrupted by an error, or the bug was bitten.

---

### 6. WebSocket Updates
`WS /?uid=:unitUid`

Connecting to WebSocket allows receiving bug state updates in real-time after each turn.

**Event (sent every turn):**
An array of objects representing the bug's entire current memory is sent.

**Message format:**
```json
[
  {
    "turnN": 42,
    "viewMap": [...],
    "feeling": [...],
    "lastAction": { "actionId": 1, "status": "OK" },
    "brainSleeping": true
  },
  ...
]
```

---

### 7. Delete Unit
`DELETE /api/unit/:unitUid`

Deletes the bug from the world.

**Response:**
```json
{
  "status": "deleted",
  "uid": "uuid"
}
```

---

### 8. World Statistics
`GET /api/worldStat`

Returns information about all existing bugs, food objects, and current parameters of the game world.

**Response:**
```json
{
  "units": [
    {
      "uid": "uuid",
      "name": "BugName",
      "x": 10,
      "y": 10,
      "angle": 0,
      "is_live": true,
      "current_health": 100,
      "current_energy": 100,
      "food_bites": 5,
      "bug_bites": 2
    }
  ],
  "food": [
    {
      "x": 15,
      "y": 20,
      "amount": 500,
      "type": 1
    }
  ],
  "turnN": 42,
  "decisionTime": 10.5,
  "activityPercent": 100
}
```

## Time Mechanics
* Initial turn time: 10 seconds.
* Dynamically changes from 1 to 30 seconds depending on whether all bugs managed to send actions.
