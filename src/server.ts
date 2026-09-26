import Fastify from "fastify";
import cors from "@fastify/cors";
import { Server } from "socket.io";

import {
  createRoom,
  getRoom,
  removeUserFromRoom,
} from "./rooms";

async function startServer() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: true,
  });

  const io = new Server(app.server, {
    cors: {
      origin: "*",
    },
  });

  app.get("/", async () => {
    return {
      name: "watch-party-server",
      status: "ok",
    };
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    socket.on("create-room", () => {
      const room = createRoom(socket.id);

      socket.data.roomId = room.id;
      socket.data.role = "host";
      socket.join(room.id);

      socket.emit("room-created", {
        roomId: room.id,
        role: "host",
      });

      console.log(
        `Room created: ${room.id} by ${socket.id}`,
      );
    });

    socket.on(
      "join-room",
      ({ roomId }: { roomId: string }) => {
        const room = getRoom(roomId);

        if (!room) {
          socket.emit("room-error", {
            message: "Room not found",
          });

          return;
        }

        if (room.viewers.size >= 1) {
          socket.emit("room-error", {
            message: "Room already has a viewer",
          });

          return;
        }

        room.viewers.add(socket.id);
        socket.data.roomId = room.id;
        socket.data.role = "viewer";

        socket.join(room.id);

        socket.emit("room-joined", {
          roomId: room.id,
          role: "viewer",
        });

        io.to(room.hostId).emit("viewer-joined", {
          viewerId: socket.id,
        });

        console.log(
          `Viewer ${socket.id} joined room ${room.id}`,
        );
      },
    );

    function leaveCurrentRoom() {
      const roomId = socket.data.roomId as string | undefined;

      if (!roomId) {
        return;
      }

      const room = getRoom(roomId);

      if (!room) {
        socket.data.roomId = undefined;
        socket.data.role = undefined;
        return;
      }

      const wasHost = room.hostId === socket.id;

      removeUserFromRoom(room.id, socket.id);
      socket.leave(room.id);
      socket.data.roomId = undefined;
      socket.data.role = undefined;

      if (wasHost) {
        io.to(room.id).emit("host-left");
        console.log(`Host left room ${room.id}`);
      } else {
        io.to(room.hostId).emit("viewer-left", {
          viewerId: socket.id,
        });
        console.log(`Viewer ${socket.id} left room ${room.id}`);
      }
    }

    socket.on("leave-room", () => {
      leaveCurrentRoom();
    });

    socket.on("disconnect", () => {
      console.log(
        `Client disconnected: ${socket.id}`,
      );

      leaveCurrentRoom();
    });

    socket.on(
      "webrtc-offer",
      ({
        target,
        offer,
      }: {
        target: string;
        offer: RTCSessionDescriptionInit;
      }) => {
        io.to(target).emit("webrtc-offer", {
          sender: socket.id,
          offer,
        });
      },
    );

    socket.on(
      "webrtc-answer",
      ({
        target,
        answer,
      }: {
        target: string;
        answer: RTCSessionDescriptionInit;
      }) => {
        io.to(target).emit("webrtc-answer", {
          sender: socket.id,
          answer,
        });
      },
    );

    socket.on(
      "webrtc-ice-candidate",
      ({
        target,
        candidate,
      }: {
        target: string;
        candidate: RTCIceCandidateInit;
      }) => {
        io.to(target).emit("webrtc-ice-candidate", {
          sender: socket.id,
          candidate,
        });
      },
    );

  });

  const PORT = Number(process.env.PORT) || 3000;

  await app.listen({
    port: PORT,
    host: "0.0.0.0",
  });

  console.log(
    `Server running on port ${PORT}`,
  );
}

startServer().catch((error) => {
  console.error(error);

  process.exit(1);
});