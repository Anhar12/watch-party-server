"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRoom = createRoom;
exports.getRoom = getRoom;
exports.getRoomByUser = getRoomByUser;
exports.removeUserFromRoom = removeUserFromRoom;
const rooms = new Map();
function generateRoomId() {
    return Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
}
function createRoom(hostId) {
    let id = generateRoomId();
    while (rooms.has(id)) {
        id = generateRoomId();
    }
    const room = {
        id,
        hostId,
        viewers: new Set(),
    };
    rooms.set(id, room);
    return room;
}
function getRoom(roomId) {
    return rooms.get(roomId);
}
function getRoomByUser(userId) {
    for (const room of rooms.values()) {
        if (room.hostId === userId ||
            room.viewers.has(userId)) {
            return room;
        }
    }
    return undefined;
}
function removeUserFromRoom(roomId, userId) {
    const room = rooms.get(roomId);
    if (!room) {
        return undefined;
    }
    if (room.hostId === userId) {
        rooms.delete(roomId);
        return room;
    }
    room.viewers.delete(userId);
    return room;
}
