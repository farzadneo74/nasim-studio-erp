import { PrismaClient } from "../generated/master-client"

const globalForMaster = globalThis as unknown as { master: PrismaClient | undefined }

export const masterDb =
  globalForMaster.master ??
  new PrismaClient({ log: ["error", "warn"] })

if (process.env.NODE_ENV !== "production") globalForMaster.master = masterDb

