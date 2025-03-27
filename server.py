from fastapi import FastAPI, WebSocket, WebSocketDisconnect
import uvicorn

app = FastAPI()

# Store connected players and their latest state
# Format: { player_id: {"ws": websocket, "state": latest_state_dict} }
connected_players = {}

# Default initial state for a player
DEFAULT_STATE = {
    "position": { "x": 0, "y": 0, "z": 0 },
    "rotation": { "y": 0 },
    "velocity": { "x": 0, "y": 0, "z": 0 },
    "animation": "idle",
    "balloons": [0xff0000, 0x0000ff, 0x00ff00] # Default 3 balloons (colors might vary)
}

@app.websocket("/ws/game")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    player_id = str(id(websocket))
    # Store connection and initialize with default state
    connected_players[player_id] = {"ws": websocket, "state": DEFAULT_STATE.copy()}
    connected_players[player_id]["state"]["id"] = player_id # Add id to state

    # Send player their ID
    await websocket.send_json({
        "type": "player_id",
        "playerId": player_id
    })

    # Prepare the current world state for the new player using stored states
    current_players_state = {}
    for pid, player_data in connected_players.items():
        if pid != player_id: # Don't include the new player itself
            current_players_state[pid] = player_data["state"]

    # Send world state (existing players with their latest known state) to the new player
    await websocket.send_json({
        "type": "world_state",
        "playerId": player_id,
        "players": current_players_state
    })

    # Tell other players this one joined (using the default state for now)
    # Ideally, the client sends its initial state right after connecting
    player_joined_data = DEFAULT_STATE.copy()
    player_joined_data["id"] = player_id
    for pid, player_data in connected_players.items():
        if pid != player_id:
            await player_data["ws"].send_json({
                "type": "player_joined",
                "player": player_joined_data
            })

    try:
        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")

            if msg_type == "player_update":
                # Update the player's state on the server
                received_state = data["state"]
                # Ensure essential fields exist, merge with previous state if needed
                current_server_state = connected_players[player_id]["state"]
                updated_state = {**current_server_state, **received_state} # Merge, new data overwrites old
                updated_state["id"] = player_id # Ensure id is always correct

                # Validate/Sanitize balloon data (ensure it's a list)
                if "balloons" not in updated_state or not isinstance(updated_state["balloons"], list):
                    updated_state["balloons"] = [] # Default to empty list if invalid

                connected_players[player_id]["state"] = updated_state

                # Relay update to others
                for pid, player_data in connected_players.items():
                    if pid != player_id:
                        await player_data["ws"].send_json({
                            "type": "player_state",
                            "playerId": player_id,
                            "state": received_state
                        })

            elif msg_type == "environment_update":
                 # TODO: Consider if environment state needs to be stored too
                for pid, player_data in connected_players.items():
                    if pid != player_id:
                        await player_data["ws"].send_json({
                            "type": "environment_update",
                            "target": data.get("target"),
                            "state": data.get("state")
                        })

            elif msg_type == "chat":
                for pid, player_data in connected_players.items():
                    # Send chat message to everyone, including sender
                    await player_data["ws"].send_json({
                        "type": "chat",
                        "playerId": player_id,
                        "message": data.get("message")
                    })

    except WebSocketDisconnect:
        # Remove player from tracking
        if player_id in connected_players:
            del connected_players[player_id]
        # Notify remaining players
        for player_data in connected_players.values():
            await player_data["ws"].send_json({
                "type": "player_left",
                "playerId": player_id
            })

if __name__ == "__main__":
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)
