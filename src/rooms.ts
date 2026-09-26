export interface Room {
  id: string;
  hostId: string;
  viewers: Set<string>;
}

const rooms = new Map<string, Room>();

function generateRoomId(): string {
  return Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
}

export function createRoom(hostId: string): Room {
  let id = generateRoomId();

  while (rooms.has(id)) {
    id = generateRoomId();
  }

  const room: Room = {
    id,
    hostId,
    viewers: new Set(),
  };

  rooms.set(id, room);

  return room;
}

export function getRoom(roomId: string): Room | undefined {
  return rooms.get(roomId);
}

export function getRoomByUser(
  userId: string,
): Room | undefined {
  for (const room of rooms.values()) {
    if (
      room.hostId === userId ||
      room.viewers.has(userId)
    ) {
      return room;
    }
  }

  return undefined;
}

export function removeUserFromRoom(
  roomId: string,
  userId: string,
): Room | undefined {
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