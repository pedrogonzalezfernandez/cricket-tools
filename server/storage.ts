// Storage interface for the audio score app
// Currently using in-memory state managed directly in routes.ts via Socket.IO
// This file is kept for potential future persistent storage needs

export interface IStorage {
  // Future storage methods can be added here
}

export class MemStorage implements IStorage {
  constructor() {}
}

export const storage = new MemStorage();
